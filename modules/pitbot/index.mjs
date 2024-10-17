/**
 * Verious features to handle disciplinary action against members.
 * @module modules/pitbot
 */
import { updateAllRoles } from './roles.mjs';
import Database from '../../classes/Database.mjs';

let updateTimer;

/**
 * Requires the DirectMessages and GuildMessages intents in order to receive events for messages, and the MessageContent intent in order to see any content of messages. Also requires GuildMembers to fetch the roles of guild members.
 */ 
export const intents = ["GuildMembers","DirectMessages","GuildMessages","MessageContent"];

/**
 * Loads the database of logged disciplinary actions, creating and initializing it if necessary.
 */
export async function onStart(module) {
  module.database = new Database();
  await module.database.connect(`storage/${module.options.databaseFile??'pitbot.sqlite'}`);
  await module.database.run('CREATE TABLE IF NOT EXISTS bullethell (userId TEXT, date NUMBER, duration NUMBER, messageLink TEXT);');
  await module.database.run('CREATE TABLE IF NOT EXISTS strikes (userId TEXT, modId TEXT, comment TEXT, severity NUMBER, date NUMBER UNIQUE ON CONFLICT IGNORE, expired BOOLEAN NOT NULL DEFAULT 0);');
  await module.database.run('CREATE TABLE IF NOT EXISTS warnings (userId TEXT, modId TEXT, comment TEXT, date NUMBER UNIQUE ON CONFLICT IGNORE);');
}

/**
 * Registers the event handlers for interacting with the bot.
 */
export async function onReady(module) {
  await this.listenerManager.createFromFile('modules/pitbot/event.mjs', {
    eventHandlers: {
      messageCreate: 'messageCreate',
      guildMemberAdd: 'guildMemberAdd',
      guildAuditLogEntryCreate: 'guildAuditLogEntryCreate', // Requires VIEW_AUDIT_LOG
    },
    nocache: true,
  });
  
  let logChannel = await this.client.channels.fetch(module.options.logChannelId);
  let members = await logChannel.guild.members.fetch();
  
  let options = {
    cmdDefs: {definition:'definition', handler:'handler'},
    guildIds: [logChannel.guild.id],
    nocache: true,
    source: {module:module.name},
  };
  await this.listenerManager.createFromFile('modules/pitbot/commands/timeout.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/release.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/strikes.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/removestrike.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/editcomment.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/warn.mjs', options);
  await this.listenerManager.createFromFile('modules/pitbot/commands/warns.mjs', options);
  
  await updateAllRoles.call(this.client);
  updateTimer = setInterval(updateAllRoles.bind(this.client), 60000);
  return true;
}

export async function onUnload(module) {
  clearInterval(updateTimer);
  await module.database?.close();
  this.listenerManager.listeners
    .filter(lis => lis.source?.module === module.name)
    .forEach(lis => lis.delete());
}
