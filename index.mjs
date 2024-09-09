import Bot from './classes/Bot.mjs';

Bot.logInfo(`************************************************`);
Bot.logInfo(`************* Starting Discord Bot *************`);
Bot.logInfo(`************************************************`);
  
Bot.loadOptions({
  multiples: [],
  aliases: {
    '--config': ['-c'],
  },
});

(async function() {
  try {
    await Bot.loadConfigFile(Bot.options['--config'] ?? 'config.json');
    await Bot.start();
  }
  catch(err) {
    Bot.logError(`A fatal error occurred:`, err);
    Bot.client?.destroy();
  }
})();
