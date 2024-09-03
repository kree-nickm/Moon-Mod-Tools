/** @module classes/BotModule */

/**
 * Encapsulates all of the methods for loading and running bot modules.
 */
export default class BotModule {
  bot;
  name;
  indexFile;
  defaultOptions;
  options;
  
  constructor(bot, name, options={}) {
    this.bot = bot;
    this.name = name;
    this.indexFile = `modules/${name}/index.mjs`;
    this.defaultOptions = options;
  }
  
  /**
   * Load a bot module from the modules directory. Can be used to reload a module's code. If used after bot is started/ready, will attempt to call the appropriate module setup methods.
   * @param {Object} moduleData
   * @param {string} moduleData.name - Name of the directory containing the module's code.
   * @param {Object.<string, *>} [moduleData.options={}] - Module-specific configuration options that the module requires in order to run.
   * @param {boolean} [moduleData.reload=false] - Whether to reload the module's code from the directory after it has already been loaded.
   * @returns {boolean} True if the module was loaded (or reloaded) and all applicable setup methods succeeded; false otherwise.
   */
  async load({options, reload=false}={}) {
    if (!this.indexFile) {
      this.bot.logError(`No module name given.`);
      return false;
    }
    
    if (this.imports && !reload) {
      this.bot.logError(`Module '${this.name}' was already loaded. Pass 'reload:true' to reload it.`);
      return false;
    }
    
    try {
      this.imports = await this.bot.safeImport(this.indexFile, {reload});
      this.bot.logInfo(`Module '${this.name}' loaded.`);
    }
    catch(err) {
      this.bot.logError(`Module '${this.name}' failed to load.`, err);
      return false;
    }
    
    if (options)
      this.options = Object.assign(this.defaultOptions, options);
    else
      this.options = this.defaultOptions;
    
    // If module is being loaded after bot startup, we need to call the onStart method now and (TODO) double-check the intents/partials.
    if (this.bot.client)
      if(!this.start())
        return false;
    
    // If module is being loaded after bot is ready, we need to call the onReady method now.
    if (this.bot.client?.isReady())
      if(!this.ready())
        return false;
    
    return true;
  }
  
  async start() {
    if(!this.imports) {
      this.bot.logError(`Module '${this.name}' failed to ready because it was not loaded.`);
      return false;
    }
    
    if (typeof(this.imports.onStart) === 'function') {
      try {
        let start = this.imports.onStart.call(this.bot, this);
        if (start && start instanceof Promise)
          start = await start;
        this.bot.logInfo(`Module '${this.name}' started.`);
      }
      catch(err) {
        this.bot.logError(`Module '${this.name}' failed to start.`, err);
        return false;
      }
    }
    else
      this.bot.logInfo(`Module '${this.name}' started.`);
    return true;
  }
  
  async ready() {
    if(!this.imports) {
      this.bot.logError(`Module '${this.name}' failed to ready because it was not loaded.`);
      return false;
    }
    
    if (typeof(this.imports.onReady) === 'function') {
      try {
        let ready = this.imports.onReady.call(this.bot, this);
        if (ready && ready instanceof Promise)
          ready = await ready;
        this.bot.logInfo(`Module '${this.name}' ready.`);
      }
      catch(err) {
        this.bot.logError(`Module '${this.name}' failed to ready.`, err);
        return false;
      }
    }
    else
      this.bot.logInfo(`Module '${this.name}' ready.`);
    return true;
  }
}
