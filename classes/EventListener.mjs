/** @module classes/EventListener */
import Listener from './Listener.mjs';

export default class EventListener extends Listener {
  eventName;
  once;
  
  constructor(manager, options) {
    super(manager, options);
    
    if (options.eventName)
      this.eventName = options.eventName;
    else
      throw new Error(`Invalid event name.`);
    
    this.once = options.once;
    
    if (this.guildId !== '') {
      this.manager.bot.logWarn(`Only global event listeners are supported; tried to create one for guild '${this.guildId}'.`);
      this.guildId = '';
    }
  }
  
  register() {
    if (!super.register())
      return false;
    
    if (this.once)
      this.manager.bot.client.once(this.eventName, this.handler);
    else
      this.manager.bot.client.on(this.eventName, this.handler);
    return true;
  }
  
  unregister() {
    if (!super.unregister())
      return false;
    
    this.manager.bot.client.off(this.eventName, this.handler);
    return true;
  }
  
  isRegistered() {
    let events = this.manager.bot.client?._events?.[this.eventName];
    
    if (!events)
      return false;
    
    if (typeof(events) === 'function')
      return events === this.handler;
    
    if (Array.isArray(events))
      return events.includes(this.handler);
    
    this.manager.bot.logWarn(`Event list is an unknown type:`, events);
    return false;
  }
  
  toString() {
    return `[${this.constructor.name} ${this.eventName}]`;
  }
}
