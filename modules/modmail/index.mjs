/**
 * Allows users to report messages or send messages to the moderation team as a whole in the form of a ticket. Also allows to moderators to discuss the report, respond to the user, and close the ticket.
 * @module modules/modmail
 * @todo checkmark on the ticket, same as on messages mods type to the user, idk what it does if anything. tags for ticket status. interaction button that goes in the #modmail channel.
 */
import Database from '../../classes/Database.mjs';

/**
 * Requires the DirectMessages intent in order to receive any events for messages, and the MessageContent intent in order to see any content of messages.
 */ 
export const intents = ["DirectMessages","MessageContent"];

/**
 * Requires the Channel partial to recognize when DM channels are created.
 */ 
export const partials = ["Channel"];

/**
 * Loads the database of tickets, creating and initializing it if necessary.
 */
export async function onStart(module) {
  module.database = new Database();
  await module.database.connect(`storage/${module.options.databaseFile??'modmail.sqlite'}`);
  await module.database.run('CREATE TABLE IF NOT EXISTS tickets (userId TEXT, threadId TEXT UNIQUE ON CONFLICT REPLACE, number INTEGER);');
}

/**
 * Registers the event handlers for opening a ticket. Fetches all tickets to build the ticket database.
 */
export async function onReady(module) {
  // Load the ticket channel and ensure it is set up.
  let mailChannel = await this.client.channels.fetch(module.options.mailChannelId);
  if (!mailChannel?.isThreadOnly()) {
    this.logError(`modmail requires mailChannelId to be a forum channel.`);
    return false;
  }
  
  // Register commands/interactions
  await this.registerEventHandlerFile('modules/modmail/event.mjs', {
    messageCreate: 'messageCreate',
  });
  await this.registerApplicationCommandFile('modules/modmail/reportMessage.mjs', {guildIds:[mailChannel.guildId]});
  
  // Fetch all tickets.
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
  
  // Add all tickets to the database.
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
  
  return true;
}
