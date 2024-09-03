/**
 * Verious features to handle disciplinary action against members.
 * @module modules/pitbot
 */
import { updateAllRoles } from './manager.mjs';
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
  });
  
  let logChannel = await this.client.channels.fetch(module.options.logChannelId);
  let members = await logChannel.guild.members.fetch();
  
  await updateAllRoles.call(this.client);
  updateTimer = setInterval(async () => {
    await updateAllRoles.call(this.client);
  }, 60000);
  return true;
}

/*
PitBot
A "timeout" command that adds the "BACKTOTHEPIT" role to a user for a specified amount of time. If no time is provided, the role is added indefinitely.
  Timeouts save a "strike" against the user in their discipline history alongside the comment, date, issuer, and duration of the strike.
Whenever moderation action is taken against a user, that user is notified by the bot including the duration of their timeout, the comment provided, their active strikes, but not the issuer.
Strikes decay off users from "active" to "inactive" after a certain amount of time of no disciplinary action. The details of this decay can be found here: ⁠🌙 ²⁠.
Mods can check a user's punishment history, release a user from a timeout prematurely, and remove/edit strikes with their own commands (!strikes <user>, !release <optional:amend>, and !removestrike <strikeID>, !editcomment <strikeID> <comment> respectively).
*/
