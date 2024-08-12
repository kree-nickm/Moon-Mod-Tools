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
  }
  catch(err) {
    Bot.logError(err);
    Bot.client?.destroy();
  }
})();
