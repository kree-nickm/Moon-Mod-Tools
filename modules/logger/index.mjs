/**
 * Requires the GuildMessages intent in order to receive any events for messages.
 * Requires the MessageContent intent in order to see any content of messages. 'MESSAGE CONTENT' must also be enabled in the bot's Discord developer portal.
 */
export const intents = ["GuildMessages","MessageContent"];

export async function onStart(bot, options) {
  await bot.registerEventHandlerFile('modules/logger/events/log.mjs', {
    messageUpdate: 'messageUpdate',
    messageDelete: 'messageDelete',
    raw: 'raw',
  });
  bot.logInfo(`Module 'logger' initialized.`);
};
