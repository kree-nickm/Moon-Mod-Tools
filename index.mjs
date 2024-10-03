import Bot from './classes/Bot.mjs';
//console.log(process);
Bot.log('info', `************************************************`);
Bot.log('info', `************* Starting Discord Bot *************`);
Bot.log('info', `************************************************`);

(async function() {
  try {
    let options = Bot.parseCmdLine();
    await Bot.loadConfigFile(options.config ?? options.c ?? 'config.json');
    await Bot.start();
  }
  catch(err) {
    Bot.log('error', `A fatal error occurred during startup:`, err);
    Bot.client?.destroy();
  }
})();
