import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import Application from './Application.mjs';

/**
 * Contains methods that pertain to a Discord.js bot.
 */
export default class Bot extends Application {
  /**
   * Values loaded from the configuration file, including defaults for any values missing from the file.
   * @type {Object.<string, *>}
   */
  static config = {};
  
  /**
   * The reference to the Discord client.
   * @type {Client}
   */
  static client;
  
  /**
   * The reference to the Discord REST API.
   * @type {REST}
   */
  static rest;
  
  /**
   * @typedef SlashCommand
   * @type {Object}
   * @property {Object} data - Slash command data as defined by the Discord API.
   * @property {Function} handler - The function to run when the slash command is used.
   * @property {Object} options - Additional options regarding to slash command.
   * @property {string[]} options.guildIds - If specified, limits the command to the listed guilds.
   */
  /**
   * The registered slash commands.
   * @type {Object.<string, SlashCommand>}
   */
  static slashCommands = {};
  
  /**
   * Load a JSON file containing the information that the bot needs to operate.
   * @param {string} filename - 
   */
  static async loadConfigFile(filename) {
    this.config = await this.importJSON(filename);
    if (!this.config)
      throw new Error(`File '${filename}' is not a valid configuration file.`);
    if (!this.config.id)
      throw new Error(`File '${filename}' has no 'id' configuration option.`);
    if (!this.config.token)
      throw new Error(`File '${filename}' has no 'token' configuration option.`);
    if (!this.config.intents)
      this.config.intents = [];
    if (!this.config.partials)
      this.config.partials = [];
    if (!this.config.slashCommands)
      this.config.slashCommands = [];
  }
  
  /**
   * Initialize the Discord.js bot client and log it in.
   */
  static async start() {
    if (this.client) {
      this.logWarn(`Tried to create another Discord.js client when one already exists.`);
      return false;
    }
    
    this.client = new Client({
      intents: this.config.intents.map(intent => GatewayIntentBits[intent]),
      partials: this.config.partials.map(partial => Partials[partial]),
    });
    this.client.master = this;
    this.rest = new REST().setToken(this.config.token);
    
    let guildIds = [];
    for(let cmdDef of this.config.slashCommands) {
      let cmd = await this.safeImport(cmdDef.filename);
      this.registerSlashCommand(cmd.data, cmd.handler, {guildIds:cmdDef.guildIds});
      if (Array.isArray(cmdDef.guildIds)) {
        for (let gid of cmdDef.guildIds)
          if (!guildIds.includes(gid))
            guildIds.push(gid);
      }
      else {
        if (!guildIds.includes('*'))
          guildIds.push('*');
      }
    }
    for (let gid of guildIds) {
      if(gid === '*')
        this.putSlashCommands();
      else
        this.putSlashCommands(gid);
    }
    
    this.registerEventHandler("ready", () => {
      this.logInfo(`Discord bot is ready.`);
    });
    this.registerEventHandler("interactionCreate", interaction => {
      if (interaction.isChatInputCommand()) {
        if (!this.slashCommands[interaction.commandName])
          return;
        this.slashCommands[interaction.commandName].handler.call(this.client, interaction);
      }
    });
    
    await this.client.login(this.config.token);
    return true;
  }
  
  /**
   * Wrapper for adding an event listener to this Discord.js client, ensuring that the handler is a function.
   */
  static registerEventHandler(eventName, handler) {
    if (typeof(handler) === 'function')
      this.client.on(eventName, handler);
    else
      this.logWarn(`Tried to register a non-function to the handler '${eventName}'.`);
  }
  
  /**
   * Adds a slash command to the bot's command list. The command will not be active until Bot.putSlashCommands() is called.
   */
  static registerSlashCommand(data, handler, {guildIds}={}) {
    if (!data?.name) {
      this.logWarn(`Invalid slash command data:`, data);
      return false;
    }
    
    if (typeof(handler) !== 'function') {
      this.logWarn(`Tried to register a non-function to the slash command '${data.name}'.`);
      return false;
    }
    
    this.slashCommands[data.name] = {
      data,
      handler,
      options: {
        guildIds,
      },
    };
    return true;
  }
  
  /**
   * Sends registered slash commands to the Discord API. Sends either the commands for one guild, or global commands.
   */
  static async putSlashCommands(guildId) {
    let url;
    let commands;
    if (guildId) {
      url = Routes.applicationGuildCommands(this.config.id, guildId);
      commands = Object.values(this.slashCommands).filter(cmd => cmd.options.guildIds?.includes(guildId));
    }
    else {
      url = Routes.applicationCommands(this.config.id);
      commands = Object.values(this.slashCommands).filter(cmd => !cmd.options?.guildIds);
    }
    let data = await this.rest.put(url, {body: commands.map(cmd => cmd.data)});
    this.logInfo(`Registered slash commands${guildId?' for guild '+guildId:''}:\n`, data.map(cmd => `\t/${cmd.name} (${cmd.options?.length??0})`).join(`\n`));
  }
}
