/**
 * Logs edited and deleted messages to a specified channel in a guild.
 * @module modules/logger
 */

/**
 * GuildMessages is required to see messages sent in a guild, and MessageContent is required to actually see the content of those messages.
 */
export const intents = ["GuildMessages","MessageContent"];

/**
 * Registers the event handlers for edited and deleted messages.
 * @see {@link module:modules/logger/log}
 */
export async function onStart(module) {
  await this.registerEventHandlerFile('modules/logger/events/log.mjs', {
    messageUpdate: 'messageUpdate',
    messageDelete: 'messageDelete',
    raw: 'raw',
  });
  this.logInfo(`Module 'logger' initialized.`);
};
