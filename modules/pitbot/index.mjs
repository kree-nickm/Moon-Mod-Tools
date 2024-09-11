/**
 * Verious features to handle disciplinary action against members.
 * @module modules/pitbot
 */
import { updateAllRoles } from './roles.mjs';
import Database from '../../classes/Database.mjs';

let updateTimer;

/**
 * Requires the DirectMessages and GuildMessages intents in order to receive events for messages, and the MessageContent intent in order to see any content of messages. Also requires GuildMembers to fetch the roles of guild members in bulk.
 */ 
export const intents = ["GuildMembers","DirectMessages","GuildMessages","MessageContent"];

/**
 * Loads the database of logged disciplinary actions, creating and initializing it if necessary.
 */
export async function onStart(module) {
  module.database = new Database();
  await module.database.connect(`storage/${module.options.databaseFile??'pitbot.sqlite'}`);
  await module.database.run('CREATE TABLE IF NOT EXISTS bullethell (userId TEXT, date NUMBER, duration NUMBER);');
  await module.database.run('CREATE TABLE IF NOT EXISTS strikes (userId TEXT, modId TEXT, comment TEXT, date NUMBER, severity NUMBER);');
  await module.database.run('CREATE TABLE IF NOT EXISTS warnings (userId TEXT, modId TEXT, comment TEXT, date NUMBER);');
}

/**
 * Registers the event handlers for interacting with the bot.
 */
export async function onReady(module) {
  await this.registerEventHandlerFile('modules/pitbot/event.mjs', {
    messageCreate: 'messageCreate',
    guildMemberAdd: 'guildMemberAdd',
  });
  
  let logChannel = await this.client.channels.fetch(module.options.logChannelId);
  let members = await logChannel.guild.members.fetch();
  
  await this.registerApplicationCommandFile('modules/pitbot/commands/strike.mjs', {guildIds:[logChannel.guild.id]});
  //await this.registerApplicationCommandFile('modules/pitbot/commands/release.mjs', {guildIds:[logChannel.guild.id]});
  //await this.registerApplicationCommandFile('modules/pitbot/commands/strikes.mjs', {guildIds:[logChannel.guild.id]});
  //await this.registerApplicationCommandFile('modules/pitbot/commands/removestrike.mjs', {guildIds:[logChannel.guild.id]});
  //await this.registerApplicationCommandFile('modules/pitbot/commands/editcomment.mjs', {guildIds:[logChannel.guild.id]});
  
  await updateAllRoles.call(this.client);
  updateTimer = setInterval(async () => {
    await updateAllRoles.call(this.client);
  }, 60000);
  return true;
}

export async function onUnload(module) {
  clearInterval(updateTimer);
  await module.database?.close();
  // TODO: Unregister event handlers.
}
