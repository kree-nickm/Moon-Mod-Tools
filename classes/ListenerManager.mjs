/** @module classes/ListenerManager */
import * as path from 'node:path';
import { Routes } from 'discord.js';
import EventListener from './EventListener.mjs';
import CommandListener from './CommandListener.mjs';
import ComponentListener from './ComponentListener.mjs';

export default class ListenerManager {
  static getListenerClass(options) {
    if (options.eventName || options.eventHandlers)
      return EventListener;
    else if (options.definition?.name || options.cmdDefs)
      return CommandListener;
    else if (options.component?.custom_id)
      return ComponentListener;
    else
      return null;
  }
  
  //---------------------------------------------------------------------------
  
  bot;
  listeners = [];
  
  constructor(bot) {
    this.bot = bot;
  }
  
  get({interaction, definition, guildId}) {
    if (definition) {
      return this.listeners.find(lis => lis instanceof CommandListener
        && lis.guildId === (definition?.guild_id ?? guildId ?? '')
        && lis.definition?.name === definition?.name
        && (lis.definition?.type??1) === (definition?.type??1));
    }
    
    if (interaction) {
      if (interaction.isCommand()) {
        return this.listeners.find(lis => lis instanceof CommandListener
          && lis.guildId === (interaction.commandGuildId ?? '')
          && lis.definition?.name === interaction.commandName
          && (lis.definition?.type??1) === interaction.commandType);
      }
      else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        return this.listeners.find(lis => lis instanceof ComponentListener
          && lis.component?.custom_id === interaction.customId);
      }
    }
    
    return null;
  }
  
  create(options) {
    let listenerClass = this.constructor.getListenerClass(options);
    if (!listenerClass)
      throw new Error(`Invalid listener definition: couldn't determine listener class from options.`);
    
    if (!Array.isArray(options.guildIds)) {
      if (typeof(options.guildIds) === 'string')
        options.guildIds = [options.guildIds];
      else if(options.guildIds)
        throw new Error(`Invalid format '${typeof(options.guildIds)}' for guildIds.`);
      else
        options.guildIds = [''];
    }
    
    let created = [];
    for (let guildId of options.guildIds) {
      let listener = new listenerClass(this, {...options, guildId});
      listener.register();
      created.push(listener);
    }
    return created;
  }
  
  async createFromFile(file, options) {
    file = path.resolve(file);
    
    let module = await this.bot.safeImport(file, {reload:options.nocache});
    if (!module)
      return null;
    
    if (!Array.isArray(options.guildIds)) {
      if (typeof(options.guildIds) === 'string')
        options.guildIds = [options.guildIds];
      else if(options.guildIds)
        throw new Error(`Invalid format '${typeof(options.guildIds)}' for guildIds.`);
      else
        options.guildIds = [''];
    }
    
    // Collect event listeners that might be replaced.
    let existingListeners = this.listeners.filter(lis => lis.source?.file === file && options.guildIds.includes(lis.guildId));
    
    let result = [];
    if (!options.source)
      options.source = {};
    
    // For event listeners.
    if (options.eventHandlers) {
      for (let eventName in options.eventHandlers) {
        let property = options.eventHandlers[eventName];
        
        // Collect event listeners that are going to be replaced.
        let existingEventListeners = existingListeners.filter(
          lis => lis instanceof EventListener
          && lis.source?.property === property
          && lis.eventName === eventName);
          
        try {
          // Try to create the new listener.
          let listeners = this.create({
            eventName,
            handler: module[property],
            source: {...options.source, file, property},
          });
          result = result.concat(listeners);
          
          // Delete the old ones that were for the same exact event.
          if (existingEventListeners.length)
            existingEventListeners.forEach(lis => lis.delete());
          
          this.bot.logInfo(`Registered${existingEventListeners.length?' (overwritten)':''} event listener for event '${eventName}': ${file}:${property}`);
        }
        catch(err) {
          this.bot.logError(`Failed to register event listener for event '${eventName}': ${file}:${property};`, err);
        }
      }
    }
    
    if (options.cmdDefs) {
      let definitionProp = options.cmdDefs.definition ?? 'definition';
      let handlerProp = options.cmdDefs.handler ?? 'handler';
      let definition = module[definitionProp];
      let handler = module[handlerProp];
      
      // Collect command listeners that are going to be replaced.
      let existingEventListeners = existingListeners.filter(
        lis => lis instanceof CommandListener
        && lis.definition?.name === definition?.name
        && (lis.definition?.type??1) === (definition?.type??1));
        
      try {
        let listeners = this.create({
          definition,
          handler,
          owner: options.owner,
          guildIds: options.guildIds,
          source: {...options.source, file, definitionProp, handlerProp},
        });
        result = result.concat(listeners);
        
        // Delete the old ones that were for the same exact event.
        if (existingEventListeners.length)
          existingEventListeners.forEach(lis => lis.delete());
        
        this.bot.logInfo(`Registered${existingEventListeners.length?' (overwritten)':''} command listener for command '${definition?.name}' type ${definition?.type??1}: ${file}:${definitionProp}|${handlerProp}`);
      }
      catch(err) {
        this.bot.logError(`Failed to register command listener for command '${definition?.name}' (${definition?.type??1}): ${file}:${definitionProp}|${handlerProp};`, err);
      }
    }
    
    return result;
  }

  async sendApplicationCommands() {
    let listeners = this.listeners.filter(lis => lis instanceof CommandListener && lis.registered);
    
    if (!listeners.length) {
      this.bot.logInfo(`No application commands to send.`);
      return;
    }
    
    let sortedListeners = {};
    for (let listener of listeners) {
      if (!sortedListeners[listener.guildId])
        sortedListeners[listener.guildId] = [];
      sortedListeners[listener.guildId].push(listener);
    }
    
    if (Object.entries(this.bot.existingInteractions).length) {
      this.bot.logWarn(
        `This application already has application commands registered, which will be removed and overwritten:`,
        Object.entries(this.bot.existingInteractions).map(([guildId,interactions]) => `(${guildId}): [${Object.keys(interactions).join(', ')}]`).join(', '));
    }
    
    this.bot.logInfo(`Registering application commands...`);
    for (let guildId in sortedListeners) {
      let url = guildId === ''
        ? Routes.applicationCommands(this.bot.config.id)
        : Routes.applicationGuildCommands(this.bot.config.id, guildId);
      
      try {
        let response = await this.bot.rest.put(url, {body: sortedListeners[guildId].map(lis => lis.definition)});
        
        // Finally, replace the saved responses (if any) with the new ones.
        let previousListeners = this.listeners.filter(lis => lis instanceof CommandListener && lis.guildId === guildId);
        previousListeners.forEach(lis => lis.api = null);
        
        for (let definition of response) {
          let listener = this.get({definition});
          listener.api = definition;
          this.bot.logInfo(`  ${listener}`);
        }
      }
      catch(err) {
        this.bot.logError(`Failed to send application commands to the API for '${guildId}':`, sortedListeners[guildId], err);
      }
    }
    this.bot.logInfo(`Done.`);
  }
}
