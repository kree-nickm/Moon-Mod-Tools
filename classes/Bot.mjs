/** @module classes/Bot */
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import Application from './Application.mjs';
import BotModule from './BotModule.mjs';

/**
 * Contains methods that pertain to a Discord.js bot.
 * @extends module:classes/Application
 */
export default class Bot extends Application {
  /**
   * Not yet implemented, but will be a lookup object for which intents are required by which events, to be used to warn you if you accidentally try to listen to events that you do not have the intents for.
   * @type {Object.<string, string[]>}
   */
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
   * @typedef {Object} ApplicationCommandDef
   * @property {Object} definition - Application command definition as required by the Discord API.
   * @property {Function} handler - The function to run when the application command is used.
   * @property {Object.<string, Object>} api - Dictionary of responses from the API when each command was registered, with the key being the guild ID where it was registered, or '*' for global commands.
   * @property {Object.<string, *>} options - A copy of the relevant properties in the application command definition in the configuration file.
   */
   
  /**
   * The currently registered slash commands. The keys are the command names.
   * @type {Object.<string, ApplicationCommandDef>}
   */
  static slashCommands = {};
  
  /**
   * The currently registered User context menu commands. The keys are the command names.
   * @type {Object.<string, ApplicationCommandDef>}
   */
  static userCommands = {};
  
  /**
   * The currently registered Message context menu commands. The keys are the command names.
   * @type {Object.<string, ApplicationCommandDef>}
   */
  static messageCommands = {};
  
  /**
   * The currently registered message component interactions. The keys are the customIds of the components.
   * @type {Object.<string, *>}
   */
  static componentInteractions = {};
  
  /**
   * @typedef {Object} BotModule
   * @property {Object} imports - All of the properties exported by the module's index.mjs file.
   * @property {Object} options - Module options defined in the configuration file.
   * @property {Database} [database] - If needed, stores a reference to the database used by the module.
   */
  /**
   * The modules loaded by {@link Bot#loadModule}. These are bot modules from the modules/ directory, not Node.js modules. Perhaps another name should be used, but oh well. The keys are the module names.
   * @type {Object.<string, BotModule>}
   */
  static modules = {};
  
  /**
   * @typedef {Object} StoredEvent
   * @property {string} property - The exported property name of the file that contains the event handler.
   * @property {Function} handler - A references to the function that was assigned to be an event handler.
   */
  /**
   * Stores any files that were used in {@link Bot#registerEventHandlerFile}, so that they can be unregistered or reloaded if necessary. The primary keys are file names; the secondary keys are event names with listeners present in that file.
   * @type {Object.<string, Object.<string, StoredEvent>>}
   */
  static eventFiles = {};
  
  /**
   * A buffer for all interactions being registered by this bot, before sending them to the Discord API with {@link Bot#_sendInteractions}. The keys are guild IDs, or '*' for global interactions.  The values are interaction definitions.
   * @type {Object.<string, Object>}
   */
  static interactionRegistry = {};
  
  /**
   * Whether this bot's interactions have already been send to the Discord API with {@link Bot#_sendInteractions}.
   * @type {boolean}
   */
  static interactionsSent = false;
  
  /**
   * If this application already had interactions registered in the Discord API before this bot was started, they will be collected here by {@link Bot#_fetchInteractions}. The primary keys are either a guild ID or '*' for global; the secondary keys are interaction names. The ultimate values are responses from the Discord API with the defined interaction data.
   * @type {Object.<string, Object.<string, Object>>}
   */
  static existingInteractions = {};
  
  //---------------------------------------------------------------------------
  
  /**
   * Load a JSON file containing the information that the bot needs to operate.
   * @param {string} filename - Path to the configuration file for this bot.
   * @throws Will throw an error if the file is not a valid configuration file or is missing required information.
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
    if (!this.config.applicationCommands)
      this.config.applicationCommands = [];
    if (!this.config.modules)
      this.config.modules = [];
    if (!this.config.ownerId)
      this.logWarn(`No ownerId set in the configuration file. You may want to specify your Discord user ID in that property to ensure you have full bot access.`);
  }
  
  /**
   * Initialize the Discord.js bot client and log it in.
   * @returns boolean True if the startup was successful and the bot is logged in. Note that specific errors with modules or event handlers could have occurred, but as long as the bot ultimately logged in as a result of this method call, this will return true.
   */
  static async start() {
    if (this.client) {
      this.logError(`Tried to create another Discord.js client when one already exists.`);
      return false;
    }
    
    for(let module of this.config.modules) {
      this.modules[module.name] = new BotModule(this, module.name, module.options);
      if(!await this.modules[module.name].load())
        delete this.modules[module.name];
    }
    
    // Note: Is it better to just add them, or error out if they are missing?
    // The former is obviously easier, but the latter gives the host more
    // transparency and control over which partials/intents to include.
    let intents = this.config.intents;
    let partials = this.config.partials;
    for(let name in this.modules) {
      if (Array.isArray(this.modules[name].imports.intents))
        intents = intents.concat(this.modules[name].imports.intents);
      if (Array.isArray(this.modules[name].imports.partials))
        partials = partials.concat(this.modules[name].imports.partials);
    }
    intents = [...new Set(intents)];
    partials = [...new Set(partials)];
    
    this.logDebug(`Creating Discord.js client. Intents: [${intents.join(', ')}], Partials: [${partials.join(', ')}]`);
    this.client = new Client({
      intents: intents.map(intent => GatewayIntentBits[intent]),
      partials: partials.map(partial => Partials[partial]),
    });
    this.client.master = this;
    
    for(let name in this.modules) {
      if(!await this.modules[name].start())
        delete this.modules[name];
    }
    
    await this.registerEventHandler('ready', this._onReady.bind(this));
    await this.registerEventHandler('interactionCreate', this._onInteractionCreate.bind(this));
    await this.registerEventHandler('messageCreate', message => this.logDebug(`Msg from ${message.author.username}: ${message.content?message.content:(message.embeds?.[0]?.description??message.embeds?.[0]?.title)}`));
    
    this.logInfo(`Bot logging in to Discord.`);
    this.rest = new REST().setToken(this.config.token);
    await this.client.login(this.config.token);
    
    return true;
  }
  
  /**
   * Wrapper for adding an event listener to this Discord.js client, ensuring that the handler is a function.
   * @param {string} eventName - Name of the Client event to listen for from [those available in Discord.js]{@link https://discord.js.org/docs/packages/discord.js/main/Client:Class}.
   * @param {Function} handler - Function to run when the event is emitted.
   * @param {Object.<string, *>} [options]
   * @param {boolean} [options.once=false] - Whether to call the event handler only once and then remove it.
   * @param {boolean} [options.suppressError=false] - Whether to suppress any error message generated directly by this method.
   * @return {boolean} True if the event handler was added to the Client; false otherwise.
   */
  static async registerEventHandler(eventName, handler, {once=false, suppressError=false}={}) {
    if (typeof(handler) === 'function') {
      if (once)
        this.client.once(eventName, handler);
      else
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
   * Wrapper for adding a group of event listeners to the Client that are all exported by a module file.
   * @param {string} file - The file to import the event handlers from.
   * @param {Object.<string, string>|string} handlers - An object of key/value pairs, where the key is the event name to listen for, and the value is the name of the associate event handler function exported by the module file. Alternatively, this can be the string `reload` to re-import a file that has already been imported using this method, keeping the same key/value pairs as before.
   * @returns {boolean} True if the event handler(s) were added or reloaded successfully; false otherwise.
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
  
  /**
   * Register an application command. The command definition will be stored in memory, but it will not be sent to the Discord API until {@link Bot#_sendInteractions} is called.
   * @param {Object.<string, *>} options - Import and definition options. The format of this parameter matches the format of the `modules` array in the application's configuration file, so that elements of that array can be passed directly to this method.
   * @param {Object} options.definition - The command definition as specified by the Discord API.
   * @param {Function} options.handler - The function to run when the command is used.
   * @param {boolean} [options.owner=false] - Whether this command is only usable by the bot owner.
   * @param {?string[]} [options.guildIds] - For guild-specific commands, the list of guilds to register the command in. Leave undefined or null if this is a global command.
   * @returns {boolean} True if the command definition was added to the bot's interaction registry.
   */
  static async registerApplicationCommand({definition, handler, owner=false, guildIds}) {
    if (!definition?.name) {
      this.logError(`Invalid application command definition:`, definition);
      return false;
    }
    
    if (typeof(handler) !== 'function') {
      this.logError(`Tried to register a non-function to the application command '${definition.name}'.`);
      return false;
    }
    
    let commandData = {
      definition,
      handler,
      api: {},
      options: {
        owner,
      },
    };
    
    if (definition.type === 2)
      this.userCommands[definition.name] = commandData;
    else if (definition.type === 3)
      this.messageCommands[definition.name] = commandData;
    else
      this.slashCommands[definition.name] = commandData;
    
    if (!Array.isArray(guildIds))
      guildIds = ['*'];
    for(let guildId of guildIds) {
      if (!this.interactionRegistry[guildId])
        this.interactionRegistry[guildId] = [];
      this.interactionRegistry[guildId].push(definition);
    }
    
    if (this.interactionsSent) {
      this.logError(`New interaction registered after interactions have already been sent to the Discord API. This is not yet supported. Make sure all interactions are registered during the bot startup process so they can be sent in time.`);
    }
    return true;
  }
  
  static async registerComponentInteraction({component, handler}) {
    if (!component?.custom_id) {
      this.logError(`Invalid component interaction definition:`, component);
      return false;
    }
    
    if (typeof(handler) !== 'function') {
      this.logError(`Tried to register a non-function to the component interaction '${component.custom_id}'.`);
      return false;
    }
    
    this.componentInteractions[component.custom_id] = {component, handler};
    
    return true;
  }
  
  /**
   * Register an application command based on definitions imported from a file.
   * @see {@link Bot#registerApplicationCommand}
   * @param {string} filename - The file that exports the definition of the command, the handler for the command, or both.
   * @param {Object.<string, *>} options - Import and definition options.
   * @param {string} [options.defProp='definition'] - The property of the imported module that contains the definition of the application command.
   * @param {string} [options.handProp='handler'] - The property of the imported module that contains the handler for the application command.
   * @param {boolean} [options.owner=false] - Whether this command is only usable by the bot owner.
   * @param {?string[]} [options.guildIds] - For guild-specific commands, the list of guilds to register the command in. Leave undefined or null if this is a global command.
   * @returns {boolean} True if the command definition was added to the bot's interaction registry.
   */
  static async registerApplicationCommandFile(filename, {defProp='definition', handProp='handler', owner=false, guildIds}={}) {
    let imported = await this.safeImport(filename);
    let definition = imported[defProp];
    let handler = imported[handProp];
    return await this.registerApplicationCommand({definition, handler, owner, guildIds});
  }
  
  /**
   * Compare two interaction definitions to see if they are identical. This will be needed when reloading application commands to see if the definition has changed. If it has, then the Discord API will need to be sent the updates. Otherwise, that would be a waste of an API call, so don't bother.
   * @todo Method is not usable yet, so it's just a placeholder for now.
   */
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
  
  /**
   * Method that should be called when the bot is going to shut down. Logs out from the Discord API and closes the connection to any databases, etc.
   */
  static async _onShutdown() {
    this.logInfo(`Shutting down.`);
    
    await this.client?.destroy();
    
    for(let name in this.modules) {
      if (this.modules[name].database)
        await this.modules[name].database.close();
    }
  }
  
  /**
   * Query the Discord API for any interactions that were already registered before this bot started up. They will all be replaced when {@link Bot#_sendInteractions} is called.
   */
  static async _fetchInteractions() {
    if (Object.entries(this.existingInteractions).length) {
      this.logError(`Existing interactions have already been fetched from the Discord API and saved:`, {interactions:this.existingInteractions});
      return;
    }
    
    let interactions = await this.rest.get(Routes.applicationCommands(this.config.id));
    if (interactions.length) {
      this.logWarn(`This application already has global application commands registered:`, interactions.map(inter => inter.name).join(', '), `; They will be removed and replaced by this bot's interactions.`);
      this.existingInteractions['*'] = {};
      for(let interaction of interactions) {
        this.existingInteractions['*'][interaction.name] = interaction;
      }
    }
    for (let [guildId, guild] of this.client.guilds.cache) {
      let guildInteractions = await this.rest.get(Routes.applicationGuildCommands(this.config.id, guildId));
      if (guildInteractions.length) {
        this.logWarn(`This application already has guild application commands registered in ${guild?.name??"<guild name unavailable without Guilds intent>"} (${guildId}):`, guildInteractions.map(inter => inter.name).join(', '), `; They will be removed and replaced by this bot's interactions.`);
        this.existingInteractions[guildId] = {};
        for(let interaction of guildInteractions) {
          this.existingInteractions[guildId][interaction.name] = interaction;
        }
      }
    }
  }

  /**
   * Send all of the registered interactions to the Discord API.
   * @see {@link Bot#registerApplicationCommand}
   */
  static async _sendInteractions() {
    if (this.interactionsSent) {
      this.logError(`Interactions have already been sent to the Discord API. Further interactions must be sent on an individual basis.`);
      return;
    }
    
    this.logInfo(`Registering application commands...`);
    for (let guildId in this.interactionRegistry) {
      let url = guildId === '*'
        ? Routes.applicationCommands(this.config.id)
        : Routes.applicationGuildCommands(this.config.id, guildId);
      let response = await this.rest.put(url, {body: this.interactionRegistry[guildId]});
      // Finally, store the responses.
      for (let definition of response) {
        if(definition.type === 1) {
          this.slashCommands[definition.name].api[definition.guild_id??'*'] = definition;
          this.logInfo(`  /${definition.name} (${definition.guild_id??'*'})`);
        }
        else if(definition.type === 2) {
          this.userCommands[definition.name].api[definition.guild_id??'*'] = definition;
          this.logInfo(`  User->${definition.name} (${definition.guild_id??'*'})`);
        }
        else if(definition.type === 3) {
          this.messageCommands[definition.name].api[definition.guild_id??'*'] = definition;
          this.logInfo(`  Message->${definition.name} (${definition.guild_id??'*'})`);
        }
        else {
          this.logWarn(`Invalid application command response received from Discord API.`, {definition});
        }
      }
    }
    this.interactionsSent = true;
    this.logInfo(`Done.`);
  }
  
  /**
   * Method that is called when the bot is logged in and ready. Calls the onReady method of every loaded module, and calls {@link Bot#_sendInteractions}.
   */
  static async _onReady(client) {
    await this._fetchInteractions();
    
    for(let name in this.modules) {
      if(!await this.modules[name].ready())
        delete this.modules[name];
    }
    
    for(let appCommand of this.config.applicationCommands) {
      await this.registerApplicationCommandFile(appCommand.filename, appCommand);
    }
    
    await this._sendInteractions();
    
    this.logInfo(`Discord bot is ready.`);
  }

  /**
   * Method that is called when the bot receives an interaction via the Discord API. Determines which function to pass the interaction to.
   */
  static async _onInteractionCreate(interaction) {
    //this.logDebug(`Interaction received:`, interaction);
    let commandList;
    if (interaction.isChatInputCommand())
      commandList = this.slashCommands;
    else if (interaction.isUserContextMenuCommand())
      commandList = this.userCommands;
    else if (interaction.isMessageContextMenuCommand())
      commandList = this.messageCommands;
    else if (interaction.isMessageComponent() || interaction.isModalSubmit())
      return await this._onComponentInteraction(interaction);
    else {
      this.logError(`Bot received an unknown interaction.`, {interaction});
      return;
    }
    
    if (!commandList[interaction.commandName]) {
      this.logError(`Bot received an unknown command '${interaction.commandName}'.`, {knownCommands:commandList});
      return;
    }
    
    if (commandList[interaction.commandName].options.owner && interaction.user.id !== this.config.ownerId) {
      this.logInfo(`User ${interaction.user?.username} (${interaction.user?.id}) attempted to use an owner-only application command '${interaction.commandName}'.`);
      interaction.reply({content:`You can't do that.`, ephemeral:true});
      return;
    }
    
    // Handle the interaction.
    commandList[interaction.commandName].handler.call(this.client, interaction);
    
    // Log the interaction to the console.
    let channel = await this.client.channels.fetch(interaction.channelId);
    if (channel.isDMBased()) {
      this.logInfo(`Application command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in a DM.`);
    }
    else if (interaction.guildId) {
      let guild = await this.client.guilds.fetch(interaction.guildId);
      if(channel.isThread()) {
        let parentChannel = await this.client.channels.fetch(channel.parentId);
        this.logInfo(`Application command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${interaction.guildId}) channel #${parentChannel?.name} (${parentChannel.id}) thread "${channel?.name}" (${channel.id}).`);
      }
      else {
        this.logInfo(`Application command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in guild ${guild?.name??"<guild name unavailable without Guilds intent>"} (${interaction.guildId}) channel #${channel?.name} (${channel.id}).`);
      }
    }
    else {
      this.logInfo(`Application command '${interaction.commandName}' used by ${interaction.user?.username} (${interaction.user?.id}) in an unknown location; see channel object:`, channel);
    }
  }
  
  static async _onComponentInteraction(interaction) {
    if (!this.componentInteractions[interaction.customId]) {
      this.logError(`Bot received a component interaction '${interaction.customId}'.`, {knownInteractions:this.componentInteractions});
      return;
    }
    
    this.componentInteractions[interaction.customId].handler.call(this.client, interaction);
    
    this.logInfo(`Component interaction '${interaction.customId}' used by ${interaction.user?.username} (${interaction.user?.id})`);
  }
}
