import Bot from './classes/Bot.mjs';

Bot.logInfo(`Starting Discord bot...`);
  
Bot.loadOptions({
  multiples: [],
  aliases: {
    '--config': ['-c'],
  },
});

//for(let i=30; i<108; i++) console.log(`\x1b[${i}mColor ${i}\t\x1b[0m`);

(async function() {
  try {
    await Bot.loadConfigFile(Bot.options['--config'] ?? 'config.json');
    await Bot.start();
    if (Bot.config.intents.includes('GuildMessages')) {
      Bot.registerEventHandlerFile('events/logger.mjs', {
        messageUpdate: 'messageUpdate',
        messageDelete: 'messageDelete',
        raw: 'raw',
      });
    }
    else
      Bot.logWarn(`Bot does not have the GuildMessages intents, which are required for message logging.`);
  }
  catch(err) {
    Bot.logError(`A fatal error occurred:`, err);
    Bot.client?.destroy();
  }
})();
