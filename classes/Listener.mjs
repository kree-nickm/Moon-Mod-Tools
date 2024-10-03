/** @module classes/Listener */

export default class Listener {
  manager;
  handler;
  guildId;
  source;
  registered = false;
  
  constructor(manager, options) {
    this.manager = manager;
    
    if (typeof(options.handler) === 'function')
      this.handler = options.handler;
    else
      throw new Error(`Invalid handler function for ${this.constructor.name}.`);
    
    this.guildId = options.guildId ?? '';
    this.source = options.source;
    manager.listeners.push(this);
  }
  
  register() {
    if (this.isRegistered()) {
      this.manager.bot.logWarn(`${this.constructor.name} already registered.`);
      return false;
    }
    
    this.registered = true;
    return true;
  }
  
  unregister() {
    if (!this.isRegistered()) {
      this.manager.bot.logWarn(`${this.constructor.name} is not registered.`);
      return false;
    }
    
    this.registered = false;
    return true;
  }
  
  isRegistered() {
    return this.registered;
  }
  
  delete() {
    if (this.isRegistered())
     this.unregister();
   this.manager.listeners = this.manager.listeners.filter(lis => lis !== this);
   this.handler = null;
   this.manager = null;
  }
  
  toString() {
    return `[${this.constructor.name} (guildId:${this.guildId})]`;
  }
}
