export async function initialize(bot, options) {
  if (bot.config.intents.includes('GuildMessages')) {
    await bot.registerEventHandlerFile('modules/logger/events/log.mjs', {
      messageUpdate: 'messageUpdate',
      messageDelete: 'messageDelete',
      raw: 'raw',
    });
  }
  else
    bot.logWarn(`Bot does not have the GuildMessages intents, which are required for message logging.`);
};
