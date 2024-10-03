/** @module classes/ComponentListener */
import Listener from './Listener.mjs';

export default class ComponentListener extends Listener {
  component;
  
  constructor(manager, options) {
    super(manager, options);
    
    if (options.component?.custom_id)
      this.component = options.component;
    else
      throw new Error(`Invalid component.`);
    
    if (this.guildId !== '') {
      this.manager.bot.logWarn(`Only global event listeners are supported; tried to create one for guild '${this.guildId}'.`);
      this.guildId = '';
    }
  }
  
  toString() {
    return `[${this.constructor.name} ${this.component.custom_id}]`;
  }
}
