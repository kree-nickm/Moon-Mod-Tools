/** @module classes/CommandListener */
import Listener from './Listener.mjs';

export default class CommandListener extends Listener {
  definition;
  owner;
  api;
  
  constructor(manager, options) {
    super(manager, options);
    
    if (options.definition?.name)
      this.definition = options.definition;
    else
      throw new Error(`Invalid command definition.`);
    
    this.owner = !!options.owner;
  }
  
  toString() {
    return (this.definition.type === 2 ? 'User->' : this.definition.type === 3 ? 'Message->' : this.definition.type === 4 ? 'App->' : '/') + `${this.definition.name} (${this.guildId?this.guildId:'*'})`;
  }
}

/*
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
*/
