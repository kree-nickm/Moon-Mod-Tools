import Database from '../../classes/Database.mjs';

/**
 * Requires the DirectMessages intent in order to receive any events for messages.
 * Requires the MessageContent intent in order to see any content of messages. MESSAGE CONTENT must also be enabled in the bot's Discord developer portal.
 * Requires the Channel partial to recognize when DM channels are created.
 */ 
export const intents = ["DirectMessages","MessageContent"];
export const partials = ["Channel"];

export async function onStart(module) {
  module.database = new Database();
  await module.database.connect(`storage/${module.options.databaseFile??'modmail.sqlite'}`);
  await module.database.run('CREATE TABLE IF NOT EXISTS tickets (userId TEXT, threadId TEXT UNIQUE ON CONFLICT REPLACE, number INTEGER);');
}

export async function onReady(module) {
  let mailChannel = await this.client.channels.fetch(module.options.mailChannelId);
  if (!mailChannel?.isThreadOnly()) {
    this.logError(`modmail requires mailChannelId to be a forum channel.`);
    return false;
  }
  
  await this.registerEventHandlerFile('modules/modmail/event.mjs', {
    messageCreate: 'messageCreate',
  });
  await this.registerApplicationCommand({filename:'modules/modmail/reportMessage.mjs', guildIds:[mailChannel.guildId]});
  
  let activeTickets = await mailChannel.threads.fetchActive();
  let tickets = activeTickets.threads.map(v=>v);
  
  let archivedTickets = await mailChannel.threads.fetchArchived();
  tickets = tickets.concat(archivedTickets.threads.map(v=>v));
  while (archivedTickets.hasMore) {
    archivedTickets = await mailChannel.threads.fetchArchived({before:archivedTickets.threads.last()});
    let lenCheck = tickets.length;
    tickets = tickets.concat(archivedTickets.threads.map(v=>v));
    if(lenCheck === tickets.length) {
      this.logWarn(`Had to break out of fetching archived threads.`);
      break;
    }
  }
  
  let addSmt = await module.database.prepare('INSERT INTO tickets (userId, threadId, number) VALUES (?, ?, ?)');
  for(let ticket of tickets) {
    let number = ticket.name.slice(ticket.name.lastIndexOf('-')+2);
    let threadMsg = await ticket.fetchStarterMessage();
    let userId = threadMsg.embeds[0].fields.find(fld => fld.name === 'Id')?.value;
    let user = await this.client.users.fetch(userId);
    if (!user) {
      this.logError(`Unable to determine which user to send the response to.`, {ticket, threadMsg, userId});
      continue;
    }
    await addSmt.run(user.id, ticket.id, number);
  }
  await addSmt.finalize();
  
  this.logInfo(`Module 'modmail' ready.`);
  return true;
}

/*
Users can create a ModMail ticket by either messaging the bot directly or using a right-click context menu on a message they'd like to report.
  Reporting a message via the context menu creates a ticket with a the first message being an embedded link to the reported message.
    If additional messages are reported while a user has an active ticket, the new report is just appended to the existing ticket.
Once a ticket is created, the user can message PitBot to communicate with the mod team via the ModMail queue and vice versa.
  Mods can use a command character (currently "=") to talk in a ticket without sending a message to the user.
Mods can manage the ticket with "lock", "unlock", and "close" commands.
  Lock and unlock stop/start the bot from messaging the reporter while the mods discuss the issue without needing to always use the command character.
*/
