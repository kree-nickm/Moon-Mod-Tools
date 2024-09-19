/** @module classes/BotModule */
import { GatewayIntentBits, Partials } from 'discord.js';

/**
 * Encapsulates all of the methods for loading and running bot modules.
 */
export default class BotModule {
  bot;
  name;
  indexFile;
  defaultOptions;
  options;
  
  imports;
  database;
  memory;
  
  /**
   * @param {Bot} bot - Reference to the Bot that owns this module.
   * @param {string} name - Name of the module. Without custom loading options, this must match the directory that contains the module's index.mjs file.
   * @param {Object} [options={}] - Module-specific configuration options that the module requires in order to run.
   * @param {Object} [custom={}] - Custom loading options.
   * @param {string} [custom.directory] - Directory containing the module's index.mjs file. Used if you want the module to have a name different from its directory.
   * @param {string} [custom.indexFile] - Path to the index.mjs file of the module. Used instead of `custom.directory` if the directory is not in the bot's directory.
   */
  constructor(bot, name, options={}, {directory, indexFile}={}) {
    this.bot = bot;
    this.name = name;
    this.indexFile = indexFile ?? `modules/${directory??name}/index.mjs`;
    this.defaultOptions = options;
  }
  
  /**
   * Load the module. Can be used to reload a module's code. If used after bot is started/ready, will attempt to call the appropriate module setup methods.
   * @param {Object} moduleData
   * @param {Object.<string, *>} [moduleData.options] - Module-specific configuration options that the module requires in order to run. Only needed if you want to load the module with different options than it was constructed with.
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
    
    if (reload) {
      // TODO: Modules might need to implement a method here to release some of their resources that were created during onStart or onReady.
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
    
    // If module is being loaded after bot startup, we need to call the onStart method now.
    if (this.bot.client)
      if(!await this.start())
        return false;
    
    // If module is being loaded after bot is ready, we need to call the onReady method now.
    if (this.bot.client?.isReady())
      if(!await this.ready())
        return false;
    
    return true;
  }
  
  /**
   * Calls the module's onStart method, if it exists.
   * @returns {boolean} False if errors were encountered; true otherwise.
   */
  async start() {
    if(!this.imports) {
      this.bot.logError(`Module '${this.name}' failed to ready because it was not loaded.`);
      return false;
    }
    
    // Verify the bot has the correct intents and partials that the module needs.
    let error = false;
    this.imports.intents?.forEach(intent => {
      if(!this.bot.client.options.intents.has(GatewayIntentBits[intent])) {
        error = true;
        this.bot.logError(`Bot module '${this.name}' requires the ${intent} intent, but the client was not constructed with that intent, so features that rely on it will not work.`);
      }
    });
    // TODO: I'm sure it's possible to just enable new partials here, since it's an internal Discord.js thing.
    this.imports.partials?.forEach(partial => {
      if(!this.bot.client.options.partials.includes(Partials[partial])) {
        error = true;
        this.bot.logError(`Bot module '${this.name}' requires the ${partial} partial, but the client was not constructed with that partial, so features that rely on it will not work.`);
      }
    });
    if (error)
      return false;
    
    // Run the module's start method.
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
  
  /**
   * Calls the module's onReady method, if it exists.
   * @returns {boolean} False if errors were encountered; true otherwise.
   */
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
