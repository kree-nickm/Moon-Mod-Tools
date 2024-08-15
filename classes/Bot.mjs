import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import Application from './Application.mjs';

/**
 * Contains methods that pertain to a Discord.js bot.
 */
export default class Bot extends Application {
  static RequiredIntents = {
    
  };
  
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
   * @property {Object} definition - Slash command definition as required by the Discord API.
   * @property {Function} handler - The function to run when the slash command is used.
   * @property {Object.<string, Object>} api - Collection of responses from the API when each command was registered, with the key being the guild ID where it was registered, or '*' for global commands.
   * @property {Object.<string, *>} options - A copy of the relevant properties in the slash command definition in the configuration file.
   */
  /**
   * The currently registered slash commands.
   * @type {Object.<string, SlashCommand>}
   */
  static slashCommands = {};
  
  static eventFiles = {};

  static interactionRegistry = {};
  
  /**
   * If this application already had interactions registered in the Discord API before this bot was started, they will be collected here.
   */
  static existingInteractions = {};
  
  //---------------------------------------------------------------------------
  
  /**
   * Load a JSON file containing the information that the bot needs to operate.
   * @param {string} filename - 
   */
  static async loadConfigFile(filename) {
    this.config = await this.importJSON(filename);
    
    // Check for required properties.
    if (!this.config)
      throw new Error(`File '${filename}' is not a valid configuration file.`);
    if (!this.config.id)
      throw new Error(`File '${filename}' has no 'id' configuration option.`);
    if (!this.config.token)
      throw new Error(`File '${filename}' has no 'token' configuration option.`);
    
    // Set defaults for any other missing properties.
    if (!this.config.intents)
      this.config.intents = [];
    if (!this.config.partials)
      this.config.partials = [];
    if (!this.config.slashCommands)
      this.config.slashCommands = [];
    if (!this.config.ownerId)
      this.logWarn(`No ownerId set in the configuration file. You may want to specify your Discord user ID in that property to ensure you have full bot access.`);
  }
  
  /**
   * Initialize the Discord.js bot client and log it in.
   */
  static async start() {
    if (this.client) {
      this.logError(`Tried to create another Discord.js client when one already exists.`);
      return false;
    }
    
    this.client = new Client({
      intents: this.config.intents.map(intent => GatewayIntentBits[intent]),
      partials: this.config.partials.map(partial => Partials[partial]),
    });
    this.client.master = this;
    
    await this.registerEventHandler('ready', this._onReady.bind(this));
    await this.registerEventHandler('interactionCreate', this._onInteractionCreate.bind(this));
    
    this.rest = new REST().setToken(this.config.token);
    await this.client.login(this.config.token);
    
    await this._fetchInteractions();
    await this._loadSlashCommands();
    await this._sendInteractions();
    
    return true;
  }
  
  /**
   * Wrapper for adding an event listener to this Discord.js client, ensuring that the handler is a function.
   */
  static async registerEventHandler(eventName, handler, {suppressError}={}) {
    if (typeof(handler) === 'function') {
      this.client.on(eventName, handler);
      return true;
    }
    else {
      if (!suppressError)
        this.logError(`Tried to register an invalid handler to event '${eventName}'.`, {handler});
      return false;
    }
  }
  
  /**
   * Wrapper for adding a group of event listeners to this Discord.js client that are all defined in a module file.
   */
  static async registerEventHandlerFile(file, handlers) {
    let module;
    if (handlers === 'reload') {
      if (!this.eventFiles[file]) {
        this.logWarn(`No event handlers are currently registered from '${file}'.`);
        return false;
      }
      
      handlers = {};
      for (let eventName in this.eventFiles[file]) {
        this.client.off(eventName, this.eventFiles[file][eventName].handler);
        this.logInfo(`Unregistered previous event handler for event '${eventName}' in '${file}'.`);
        handlers[eventName] = this.eventFiles[file][eventName].property;
      }
      delete this.eventFiles[file];
      module = await this.safeImport(file, {reload:true});
    }
    else
      module = await this.safeImport(file);
    
    if (!module)
      return false;
    
    if (typeof(handlers) !== 'object' || !Object.entries(handlers).length) {
      this.logError(`No valid list of handlers to load from '${file}' was given.`);
      return false;
    }
    
    for (let eventName in handlers) {
      let property = handlers[eventName];
      if (this.registerEventHandler(eventName, module[property], {suppressError:true})) {
        this.logInfo(`Registered event handler for event '${eventName}': ${file}:${property}`);
        
        // Remember the assignment, so it can be undone if this file is reloaded.
        if (!this.eventFiles[file])
          this.eventFiles[file] = {};
        if (this.eventFiles[file][eventName]) {
          this.logWarn(`A handler was already registered for this event from '${file}'; unregistering it and overwriting it.`);
          this.client.off(eventName, this.eventFiles[file][eventName].handler);
        }
        this.eventFiles[file][eventName] = {
          property,
          handler: module[property],
        };
      }
      else
        this.logError(`Tried to register an invalid handler to event '${eventName}'.`, {file, module, handler:module[property]});
    }
    return true;
  }
  
  static async _loadSlashCommands() {
    for(let {filename, owner, guildIds} of this.config.slashCommands) {
      let {definition, handler} = await this.safeImport(filename);
      if (!definition?.name) {
        this.logError(`Invalid slash command definition:`, definition);
        return false;
      }
      
      if (typeof(handler) !== 'function') {
        this.logError(`Tried to register a non-function to the slash command '${definition.name}'.`);
        return false;
      }
      
      this.slashCommands[definition.name] = {
        definition,
        handler,
        api: {},
        options: {
          filename,
          owner,
        },
      };
      
      if (!Array.isArray(guildIds))
        guildIds = ['*'];
      for(let guildId of guildIds) {
        if (!this.interactionRegistry[guildId])
          this.interactionRegistry[guildId] = [];
        this.interactionRegistry[guildId].push(definition);
      }
    }
  }
  
  static async _sendInteractions() {
    this.logInfo(`Registering slash commands...`);
    for (let guildId in this.interactionRegistry) {
      let url = guildId === '*'
        ? Routes.applicationCommands(this.config.id)
        : Routes.applicationGuildCommands(this.config.id, guildId);
      let response = await this.rest.put(url, {body: this.interactionRegistry[guildId]});
      // Finally, store the responses.
      for (let definition of response) {
        this.slashCommands[definition.name].api[definition.guild_id??'*'] = definition;
        this.logInfo(`  /${definition.name} (${definition.guild_id??'*'})`);
      }
    }
    this.logInfo(`Done.`);
  }
  
  /**
   * Adds a slash command to the bot's command list and sends the Discord API a request to create it.
   */
  static async registerSlashCommand({definition,handler}={}, {filename,guildIds,owner,overwrite=true}={}) {
    if (!definition?.name) {
      this.logError(`Invalid slash command definition:`, definition);
      return false;
    }
    
    if (typeof(handler) !== 'function') {
      this.logError(`Tried to register a non-function to the slash command '${definition.name}'.`);
      return false;
    }
    
    let api = {};
    if (Array.isArray(guildIds)) {
      for(let guildId of guildIds) {
        let guild = await this.client.guilds.fetch(guildId);
        if (!overwrite && this.existingInteractions[guildId][definition.name]) {
          if (this.compareInteractionDefinitions(this.existingInteractions[guildId][definition.name], definition)) {
            this.logWarn(`Slash command '${definition.name}' was already registered to guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${guildId}) before this bot was started, but it seems to be the same as the one on this bot, so we'll just use it.`);
            api[guildId] = this.existingInteractions[guildId][definition.name];
          }
          else {
            this.logError(`Slash command '${definition.name}' was already registered to guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${guildId}) before this bot was started. We will not overwrite it.`);
          }
        }
        else {
          let response = await this.rest.post(
            Routes.applicationGuildCommands(this.config.id, guildId),
            {body: definition});
          this.logInfo(`Registered slash command '${response.name}' for guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${guildId}).`);
          api[guildId] = response;
        }
      }
    }
    else {
      if (!overwrite && this.existingInteractions['*'][definition.name]) {
        if (this.compareInteractionDefinitions(this.existingInteractions['*'][definition.name], definition)) {
          this.logWarn(`Slash command '${definition.name}' was already registered globally before this bot was started, but it seems to be the same as the one on this bot, so we'll just use it.`);
          api['*'] = this.existingInteractions['*'][definition.name];
        }
        else {
          this.logError(`Slash command '${definition.name}' was already registered globally before this bot was started. We will not overwrite it.`);
        }
      }
      else {
        let response = await this.rest.post(
          Routes.applicationCommands(this.config.id),
          {body: definition});
        this.logInfo(`Registered slash command '${response.name}' globally.`);
        api['*'] = response;
      }
    }
    
    if (!Object.entries(api).length) {
      this.logWarn(`No slash commands were registered in attempt to register '${definition.name}'.`);
      return false;
    }
    
    this.slashCommands[definition.name] = {
      definition,
      handler,
      api,
      options: {
        filename,
        owner,
      },
    };
    return true;
  }
  
  /**
   * Removes a slash command from the bot's command list and sends the Discord API a request to delete it.
   */
  static async unregisterSlashCommand(name, {guildId,guildIds}={}) {
    if (!name) {
      this.logError(`Cannot unregister slash command with no name provided.`);
      return false;
    }
    
    if (!this.slashCommands[name]?.api) {
      this.logWarn(`Cannot unregister unknown slash command '${name}'.`);
      return false;
    }
    
    // Collect the API endpoints needed to unregister each command, and remove the commands from the bot's memory.
    let urls = [];
    if (!guildIds?.length && guildId)
      guildIds = [guildId];
    for(let gid in this.slashCommands[name].api) {
      if (!guildIds?.length || guildIds.includes(gid)) {
        if (gid === '*')
          urls.push(Routes.applicationCommand(this.config.id, this.slashCommands[name].api[gid].id));
        else
          urls.push(Routes.applicationGuildCommand(this.config.id, gid, this.slashCommands[name].api[gid].id));
        delete this.slashCommands[name].api[gid];
      }
    }
    if (!Object.entries(this.slashCommands[name].api).length)
      delete this.slashCommands[name];
    
    if (!urls.length) {
      this.logWarn(`No slash commands to remove that fit the parameters.`, {name,guildId,guildIds});
      return false;
    }
    
    for(let url of urls) {
      let response = await this.rest.delete(url);
      let guilds = guildIds?.length ? await Promise.all(guildIds.map(guildId => this.client.guilds.fetch(guildId))) : [];
      let guildsStr = guilds.length
        ? 'Guilds: '+guilds.map(guild => `${guild?.name??"<guild name unavailable without Guilds intent>"} (${guild.id})`).join(', ')
        : '';
      this.logInfo(`Unregistered slash command '${name}'.`, guildsStr);
    }
    return true;
  }
  
  static compareInteractionDefinitions(api, file) {
    file = Object.assign({
      default_member_permissions: null,
      type: 1,
      description: "",
      dm_permission: true,
      contexts: null,
      integration_types: [],
      nsfw: false,
    }, file);
    if (!api.guild_id)
      file = Object.assign({
        dm_permission: true,
        contexts: null,
        integration_types: [0],
      }, file);
    for(let prop in file) {
      if(typeof(file[prop]) !== 'object') {
        if (file[prop] !== api[prop])
          return false;
      }
    }
    return true;
  }
  
  //---------------------------------------------------------------------------
  
  static async _onShutdown() {
    
  }
  
  static async _fetchInteractions() {
    if (Object.entries(this.existingInteractions).length) {
      this.logWarn(`Existing interactions have already been fetched from the Discord API and saved:`, {interactions:this.existingInteractions});
      return;
    }
    
    let interactions = await this.rest.get(Routes.applicationCommands(this.config.id));
    if (interactions.length) {
      this.logWarn(`This application already has global application commands registered:`, interactions.map(inter => inter.name).join(', '));
      this.existingInteractions['*'] = {};
      for(let interaction of interactions) {
        this.existingInteractions['*'][interaction.name] = interaction;
      }
    }
    for (let g of this.client.guilds.cache) {
      let guild = await this.client.guilds.fetch(g[0]);
      this.logInfo(`Bot is in guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${g[0]}).`);
      let guildInteractions = await this.rest.get(Routes.applicationGuildCommands(this.config.id, g[0]));
      if (guildInteractions.length) {
        this.logWarn(`This application already has guild application commands registered in ${guild?.name??"<guild name unavailable without Guilds intent>"} (${g[0]}):`, guildInteractions.map(inter => inter.name).join(', '));
        this.existingInteractions[g[0]] = {};
        for(let interaction of guildInteractions) {
          this.existingInteractions[g[0]][interaction.name] = interaction;
        }
      }
    }
  }

  static _onReady(client) {
    this.logInfo(`Discord bot is ready.`);
  }

  static async _onInteractionCreate(interaction) {
    // Handle slash commands.
    if (interaction.isChatInputCommand()) {
      if (!this.slashCommands[interaction.commandName]) {
        this.logError(`Bot received an unknown slash command '${interaction.commandName}'.`, {knownSlashCommands:this.slashCommands});
        return;
      }
      
      if (this.slashCommands[interaction.commandName].options.owner && interaction.user.id !== this.config.ownerId) {
        this.logInfo(`User ${interaction.user?.username} (${interaction.user?.id}) attempted to use an owner-only slash command '${interaction.commandName}'.`);
        await interaction.reply({content:`You can't do that.`, ephemeral:true});
        return;
      }
      
      // Log the interaction to the console.
      let channel = await this.client.channels.fetch(interaction.channelId);
      if (channel.isDMBased()) {
        this.logInfo(`Slash command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in a DM.`);
      }
      else if (interaction.guildId) {
        let guild = await this.client.guilds.fetch(interaction.guildId);
        if(channel.isThread()) {
          let parentChannel = await this.client.channels.fetch(channel.parentId);
          this.logInfo(`Slash command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${interaction.guildId}) channel #${parentChannel?.name} (${parentChannel.id}) thread "${channel?.name}" (${channel.id}).`);
        }
        else {
          this.logInfo(`Slash command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${interaction.guildId}) channel #${channel?.name} (${channel.id}).`);
        }
      }
      else {
        this.logInfo(`Slash command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in an unknown location; see channel object:`, channel);
      }
      
      // Handle the interaction.
      this.slashCommands[interaction.commandName].handler.call(this.client, interaction);
    }
    else
      this.logError(`Bot received an unknown interaction:`, interaction);
  }
}
