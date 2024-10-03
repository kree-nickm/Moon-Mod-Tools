/**
 * Allows users to report messages or send messages to the moderation team as a whole in the form of a ticket. Also allows to moderators to discuss the report, respond to the user, and close the ticket.
 * @module modules/modmail
 * @todo checkmark on the ticket, same as on messages mods type to the user, idk what it does if anything. tags for ticket status. interaction button that goes in the #modmail channel.
 */
import Database from '../../classes/Database.mjs';
import { getTicketCreator } from './ticket.mjs';
import * as ModmailButton from './button.mjs';

/**
 * Requires the DirectMessages intent in order to receive any events for messages, and the MessageContent intent in order to see any content of messages.
 */ 
export const intents = ["DirectMessages","GuildMessages","MessageContent"];

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
  await this.listenerManager.createFromFile('modules/modmail/event.mjs', {
    eventHandlers: {
      messageCreate: 'messageCreate',
    },
    nocache: true,
    source: {module:module.name},
  });
  await this.listenerManager.createFromFile('modules/modmail/reportMessage.mjs', {
    cmdDefs: {definition:'definition', handler:'handler'},
    guildIds: [mailChannel.guildId],
    nocache: true,
    source: {module:module.name},
  });
  await this.listenerManager.createFromFile('modules/modmail/command.mjs', {
    cmdDefs: {definition:'definition', handler:'handler'},
    guildIds: [mailChannel.guildId],
    nocache: true,
    source: {module:module.name},
  });
  
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
    let dashIdx = ticket.name.lastIndexOf('-');
    if (dashIdx < 0) {
      this.logWarn(`Ticket name doesn't follow expected convention: '${ticket.name}' (${ticket.id}).`);
      break;
    }
    let number = ticket.name.slice(dashIdx+2);
    let user = await getTicketCreator.call(this.client, ticket);
    if (!user) {
      this.logWarn(`Unable to determine which user created ticket '${ticket.name}' (${ticket.id}).`);
      break;
    }
    await addSmt.run(user.id, ticket.id, number);
  }
  await addSmt.finalize();
  
  // Button for submitting modmail.
  await this.listenerManager.create({
    definition: ModmailButton.definition,
    handler: ModmailButton.handler,
    guildIds: [mailChannel.guildId],
    nocache: true,
    source: {module:module.name},
  });
  await this.listenerManager.create({
    component: ModmailButton.button,
    handler: ModmailButton.setup_modmail_button,
    nocache: true,
    source: {module:module.name},
  });
  await this.listenerManager.create({
    component: ModmailButton.modal,
    handler: ModmailButton.post_modmail,
    nocache: true,
    source: {module:module.name},
  });
  
  return true;
}

export async function onUnload(module) {
  await module.database?.close();
  this.listenerManager.listeners
    .filter(lis => lis.source?.module === module.name)
    .forEach(lis => lis.delete());
}
