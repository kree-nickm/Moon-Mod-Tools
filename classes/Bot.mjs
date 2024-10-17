/** @module classes/Bot */
import { Client, Options, GatewayIntentBits, Partials, MessageFlags, REST, Routes, version } from 'discord.js';
import Application from './Application.mjs';
import BotModule from './BotModule.mjs';
import ListenerManager from './ListenerManager.mjs';

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
  
  static listenerManager;
  
  static dmErrors = true;
  static dmWarnings = false;
  
  /**
   * The modules loaded by {@link Bot#loadModule}. These are bot modules from the modules/ directory, not Node.js modules. Perhaps another name should be used, but oh well. The keys are the module names.
   * @type {Object.<string, BotModule>}
   */
  static modules = {};
  
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
    if (!this.config.applicationCommands)
      this.config.applicationCommands = [];
    if (!this.config.modules)
      this.config.modules = [];
    if (!this.config.ownerId)
      this.logWarn(`No ownerId set in the configuration file. You may want to specify your Discord user ID in that property to ensure you have full bot access.`);
    if (isNaN(this.config.messageCacheLimit))
      this.config.messageCacheLimit = -1;
    this.debugMode = !!this.config.debugOut;
    this.dmErrors = !!this.config.dmErrors;
    this.dmWarnings = !!this.config.dmWarnings;
  }
  
  /**
   * Initialize the Discord.js bot client and log it in.
   * @returns boolean True if the startup was successful and the bot is logged in. Note that specific errors with modules or event handlers could have occurred, but as long as the bot ultimately logged in as a result of this method call, this will return true.
   */
  static async start() {
    if (this.client)
      throw new Error(`Tried to create another Discord.js client when one already exists.`);
    
    this.listenerManager = new ListenerManager(this);
    
    for(let module of this.config.modules) {
      this.modules[module.name] = new BotModule(this, module.name, module.options);
      if(!await this.modules[module.name].load())
        delete this.modules[module.name];
    }
    
    // Add all the intents required by the modules to the initial ones.
    let intents = this.config.intents;
    intents.push('Guilds');
    if (this.config.ownerId)
      intents.push('DirectMessages');
    for(let name in this.modules) {
      if (Array.isArray(this.modules[name].imports.intents))
        intents = intents.concat(this.modules[name].imports.intents);
    }
    intents = [...new Set(intents)];
    
    let clientOptions = {
      intents: intents.map(intent => GatewayIntentBits[intent]),
      partials: Object.values(Partials).filter(part => !isNaN(part)),
    };
    
    // Set any cache limits.
    let cacheOptions;
    if(this.config.messageCacheLimit > -1 /* more cache limits */) {
      cacheOptions = Options.DefaultMakeCacheSettings;
      if(this.config.messageCacheLimit > -1)
        cacheOptions.MessageManager = this.config.messageCacheLimit;
      clientOptions.makeCache = Options.cacheWithLimits(cacheOptions);
    }
    
    // Create the Discord bot.
    this.logInfo(`Discord.js Version: ${version}`);
    this.logInfo(`Creating Discord.js client. Intents: [${intents.join(', ')}], Cache:`, cacheOptions);
    this.client = new Client(clientOptions);
    this.client.master = this;
    
    // Start the modules.
    for(let name in this.modules) {
      if(!await this.modules[name].start())
        delete this.modules[name];
    }
    
    // Register the basic event handlers.
    await this.listenerManager.create({
      eventName: 'debug',
      handler: this.logDebug.bind(this, '[Discord.js]'),
    });
    await this.listenerManager.create({
      eventName: 'warn',
      handler: this.logWarn.bind(this, '[Discord.js]'),
    });
    await this.listenerManager.create({
      eventName: 'error',
      handler: this.logError.bind(this, '[Discord.js]'),
    });
    await this.listenerManager.create({
      eventName: 'ready',
      handler: this._onReady.bind(this),
    });
    await this.listenerManager.create({
      eventName: 'interactionCreate',
      handler: this._onInteractionCreate.bind(this),
    });
    await this.listenerManager.create({
      eventName: 'messageCreate',
      handler: message => {
        if (message.author.id === this.config.ownerId
            && message.content.startsWith('!'))
          return this._onOwnerMessage(message);
      },
    });
    
    // Log the bot into Discord.
    this.logInfo(`Bot logging in to Discord...`);
    this.rest = new REST().setToken(this.config.token);
    await this.client.login(this.config.token);
    
    return true;
  }
  
  //---------------------------------------------------------------------------
  
  static logError(...args) {
    super.logError(...args);
    if (this.dmErrors && this.client?.isReady() && this.config.ownerId) {
      this.client.users.fetch(this.config.ownerId).then(owner => owner.send({
        embeds: [
          {
            title: `🔴 App Error 🔴`,
            color: 0xff0000,
            description: '```\n' + args.join(' ') + '\n```',
            timestamp: new Date().toISOString(),
            footer: {text: '🔴'},
          },
        ],
      })).catch(err => super.logError(`Couldn't send the previous error to the bot owner.`, err));
    }
  }
  
  static logWarn(...args) {
    super.logWarn(...args);
    if (this.dmWarnings && this.client?.isReady() && this.config.ownerId) {
      this.client.users.fetch(this.config.ownerId).then(owner => owner.send({
        embeds: [
          {
            title: `🟡 App Warning 🟡`,
            color: 0xffff00,
            description: '```\n' + args.join(' ') + '\n```',
            timestamp: new Date().toISOString(),
            footer: {text: '🟡'},
          },
        ],
      })).catch(err => super.logError(`Couldn't send the previous warning to the bot owner.`, err));
    }
  }
  
  //---------------------------------------------------------------------------
  
  /**
   * Method that should be called when the bot is going to shut down. Logs out from the Discord API and closes the connection to any databases, etc.
   */
  static async _onShutdown() {
    this.logInfo(`Shutting down.`);
    
    await this.client?.destroy();
    
    await Promise.all(Object.values(this.modules).map(mod => mod.unload().catch(err => this.logError(`Uncaught error while unloading module '${mod.name}':`, err))));
  }
  
  /**
   * Query the Discord API for any interactions that were already registered before this bot started up. They will all be replaced when {@link Bot#_sendInteractions} is called.
   */
  static async _fetchInteractions() {
    if (Object.entries(this.existingInteractions).length) {
      this.logWarn(`Existing interactions have already been fetched from the Discord API and saved.`);
      return;
    }
    
    let interactions = await this.rest.get(Routes.applicationCommands(this.config.id));
    if (interactions.length) {
      this.existingInteractions[''] = {};
      for(let interaction of interactions) {
        this.existingInteractions[''][interaction.name] = interaction;
      }
    }
    for (let [guildId, guild] of this.client.guilds.cache) {
      let guildInteractions = await this.rest.get(Routes.applicationGuildCommands(this.config.id, guildId));
      if (guildInteractions.length) {
        this.existingInteractions[guildId] = {};
        for(let interaction of guildInteractions) {
          this.existingInteractions[guildId][interaction.name] = interaction;
        }
      }
    }
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
      appCommand.cmdDefs = {definition:'definition', handler:'handler'};
      await this.listenerManager.createFromFile(appCommand.filename, appCommand);
    }
    
    await this.listenerManager.sendApplicationCommands();
    
    if (this.config.ownerId) {
      let owner = await this.client.users.fetch(this.config.ownerId);
      try {
        await owner.send({
          embeds: [
            {
              title: 'Bot Started',
              description: '```' + process.argv.join(`\n`) + '```',
              fields: [
                {
                  name: 'Modules',
                  value: Object.keys(this.modules).join(', '),
                },
              ],
              color: 0x0000ff,
            },
          ],
        });
        await owner.dmChannel.fetch();
      }
      catch(err) {
        this.dmErrors = false;
        this.dmWarnings = false;
        this.logError(`Bot is unable to send DMs to the owner.`);
      }
    }
    
    this.logInfo(`Discord bot is ready.`);
  }
  
  /**
   * Method that is called when the bot receives an interaction via the Discord API. Determines which function to pass the interaction to.
   */
  static async _onInteractionCreate(interaction) {
    let listener = this.listenerManager.get({interaction});
    
    // Make sure the bot knows this interacton.
    if (!listener) {
      this.logWarn(`User ${interaction.user?.username} (${interaction.user?.id}) used an unknown interaction (${interaction.constructor.name}):`, ['type','context','commandName','commandType','componentType','customId','channelId','guildId'].map(prop => interaction[prop] ? `(${prop}:${interaction[prop]})` : null).filter(i=>i).join(' '));
      interaction.reply({content:`I don't recognize that interaction.`, ephemeral:true});
      return;
    }
    
    // Check if this is an owner-only command.
    if (listener.owner && interaction.user.id !== this.config.ownerId) {
      this.logInfo(`User ${interaction.user?.username} (${interaction.user?.id}) attempted to use an owner-only interaction ${listener}.`);
      interaction.reply({content:`You can't do that.`, ephemeral:true});
      return;
    }
    
    // Handle the interaction.
    try {
      let result = listener.handler.call(this.client, interaction);
      if (result && result instanceof Promise)
        result = await result;
    }
    catch(err) {
      this.logError(`Uncaught error while handling interaction ${listener} from user ${interaction.user?.username} (${interaction.user?.id}):`, err);
    }
    
    // Fallback reply, because the bot needs to reply with SOMEthing.
    let fallbackResponse;
    if(interaction.isRepliable() && !interaction.replied) {
      let fallbackMessage = {ephemeral:true, content:'Your command was seen.'};
      if (interaction.deferred) {
        let reply = await interaction.fetchReply();
        if (reply.flags.has(MessageFlags.Loading))
          fallbackResponse = await interaction.followUp(fallbackMessage);
      }
      else
        fallbackResponse = await interaction.reply(fallbackMessage);
    }
    if (fallbackResponse)
      this.logWarn(`Interaction ${listener} never gave the user ${interaction.user.username} (${interaction.user.id}) a specific response.`);
    
    // Log the interaction to the console.
    let logMsg = [
      `Interaction ${listener}`,
      `used by ${interaction.user?.username} (${interaction.user?.id})`,
    ];
    if (interaction.channel?.isDMBased()) {
      logMsg.push(`in a DM`);
      if (interaction.channel.name)
        logMsg.push(`named "${interaction.channel.name}"`);
    }
    else if (interaction.guild) {
      logMsg.push(`in guild "${interaction.guild?.name}" (${interaction.guild?.id})`);
      if(interaction.channel?.isThread()) {
        logMsg.push(`in channel #${interaction.channel?.parent?.name} (${interaction.channel?.parent?.id})`);
        logMsg.push(`thread "${interaction.channel?.name}" (${interaction.channel?.id})`);
      }
      else {
        logMsg.push(`in channel #${interaction.channel?.name} (${interaction.channel?.id})`);
      }
    }
    else {
      this.logInfo(interaction.channel);
      logMsg.push(`in an unknown location; see channel object above`);
    }
    this.logInfo(logMsg.join(' ') + '.');
  }
  
  static async _onOwnerMessage(message) {
    if (message.partial)
      message = await message.fetch();
    
    if (message.content === '!crash') {
      throw new Error('Crash command used.');
    }
    else if (message.content === '!debug on') {
      if (this.debugMode)
        message.reply({ephemeral:true, content:'Debug mode already enabled.'});
      else
        message.reply({ephemeral:true, content:'Debug mode enabled.'});
      this.debugMode = true;
    }
    else if (message.content === '!debug off') {
      if (!this.debugMode)
        message.reply({ephemeral:true, content:'Debug mode already disabled.'});
      else
        message.reply({ephemeral:true, content:'Debug mode disabled.'});
      this.debugMode = false;
    }
    else if (message.content === '!dmme errors on') {
      if (this.dmErrors)
        message.reply({ephemeral:true, content:'Errors were already being sent to you.'});
      else
        message.reply({ephemeral:true, content:'Errors will now be sent to you.'});
      this.dmErrors = true;
    }
    else if (message.content === '!dmme errors off') {
      if (!this.dmErrors)
        message.reply({ephemeral:true, content:'Errors were already not being sent to you'});
      else
        message.reply({ephemeral:true, content:'Errors will no longer be sent to you.'});
      this.dmErrors = false;
    }
    else if (message.content === '!dmme warnings on') {
      if (this.dmWarnings)
        message.reply({ephemeral:true, content:'Warnings were already being sent to you.'});
      else
        message.reply({ephemeral:true, content:'Warnings will now be sent to you.'});
      this.dmWarnings = true;
    }
    else if (message.content === '!dmme warnings off') {
      if (!this.dmWarnings)
        message.reply({ephemeral:true, content:'Warnings were already not being sent to you.'});
      else
        message.reply({ephemeral:true, content:'Warnings will no longer be sent to you.'});
      this.dmWarnings = false;
    }
    else if (message.content.startsWith('!echo')) {
      let args = message.content.split(' ').slice(1);
      let obj = this;
      for(let arg of args)
        obj = obj?.[arg];
      this.logInfo(obj);
    }
  }
}
