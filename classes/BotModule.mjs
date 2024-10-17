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
  isReady;
  
  imports;
  database;
  memory = {};
  
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
    this.isReady = false;
  }
  
  /**
   * Load the module. If used after bot is started/ready, will attempt to call the appropriate module setup methods.
   * @param {Object.<string, *>} [options] - Module-specific configuration options that the module requires in order to run. Only needed if you want to load the module with different options than it was constructed with.
   * @returns {boolean} True if the module was loaded and all applicable setup methods succeeded; false otherwise.
   */
  async load(options) {
    this.isReady = false;
    if (!this.indexFile) {
      this.bot.logError(`No module name given.`);
      return false;
    }
    
    if (this.imports) {
      this.bot.logError(`Module '${this.name}' was already loaded.`);
      return false;
    }
    
    try {
      this.imports = await this.bot.safeImport(this.indexFile);
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
   * Reload the module. Unloads the module and reruns its startup methods, if necessary.
   * @param {Object.<string, *>} [options] - Module-specific configuration options that the module requires in order to run. Only needed if you want to load the module with different options than it was constructed with.
   * @returns {boolean} True if the module was reloaded and all applicable setup methods succeeded; false otherwise.
   */
  async reload(options) {
    this.isReady = false;
    if (this.imports)
      if(!await this.unload())
        return false;
    
    try {
      this.imports = await this.bot.safeImport(this.indexFile, {reload:true});
      this.bot.logInfo(`Module '${this.name}' reloaded.`);
    }
    catch(err) {
      this.bot.logError(`Module '${this.name}' failed to reload.`, err);
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
    this.isReady = false;
    if(!this.imports) {
      this.bot.logError(`Module '${this.name}' failed to ready because it was not loaded.`);
      return false;
    }
    
    // Verify the bot has the correct intents that the module needs.
    let error = false;
    this.imports.intents?.forEach(intent => {
      if(!this.bot.client.options.intents.has(GatewayIntentBits[intent])) {
        error = true;
        this.bot.logError(`Bot module '${this.name}' requires the ${intent} intent, but the client was not constructed with that intent, so features that rely on it will not work.`);
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
    this.isReady = true;
    return true;
  }
  
  /**
   * Calls the module's onUnload method, if it exists.
   * @returns {boolean} False if errors were encountered; true otherwise.
   */
  async unload() {
    this.isReady = false;
    if(!this.imports) {
      this.bot.logError(`Module '${this.name}' failed to unload because it was not loaded.`);
      return false;
    }
    
    if (typeof(this.imports.onUnload) === 'function') {
      try {
        let unload = this.imports.onUnload.call(this.bot, this);
        if (unload && unload instanceof Promise)
          unload = await unload;
        this.bot.logInfo(`Module '${this.name}' unloaded.`);
      }
      catch(err) {
        this.bot.logError(`Module '${this.name}' failed to unload.`, err);
        return false;
      }
    }
    else
      this.bot.logInfo(`Module '${this.name}' unloaded.`);
    
    this.imports = null;
    return true;
  }
}
