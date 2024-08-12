import * as fs from 'node:fs/promises';

/**
 * Contains methods that pertain to any Node.js application, regardless of what the application's purpose is.
 */
export default class Application {
  /**
   * Object with keys as flags, and values are the option(s) of those flags in the command line.
   * @type {Object.<string, string>}
   */
  static options = {};
  
  /**
   * Parses the command line via which this Node.js application was started into an object whose keys are option flags, and their associated values are the argument that followed the flag. Assumes the first argument is a flag, and the next is an option value, alternating until all arguments are iterated through. If there are an odd number of arguments, the last one will be stored in the options object with the `_last` key.
   * @param {Object} options - Additional instructions on how certain flags should be handled.
   * @param {string[]} options.multiples - Array of flags that will be stored as arrays in the returned object, and repeats of that flag in the command line will be added to the corresponding array.
   * @param {Object.<string, string[]>} options.aliases - Object with each key being a flag, and the value is an array of flags that will be considered duplicates of the flag in the key.
   */
  static loadOptions({multiples=[], aliases={}}={}) {
    let flag;
    for (let arg of process.argv.slice(2)) {
      if (!flag) {
        for (let baseFlag in aliases) {
          if (aliases[baseFlag].includes(arg))
            arg = baseFlag;
        }
        flag = arg;
      }
      else {
        if (multiples.includes(flag)) {
          if (!this.options[flag])
            this.options[flag] = [arg];
          else
            this.options[flag].push(arg);
        }
        else
          this.options[flag] = arg;
        flag = null;
      }
    }
    if (flag)
      this.options._last = flag;
  }
  
  /**
   * Log a message to the console with added formatting.
   */
  static log(type, ...args) {
    let func;
    let opener = "";
    let closer = "";
    if (type === 'error') {
      func = console.error;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[30m\x1b[101m";
        closer = "\x1b[0m";
      }
    }
    else if (type === 'warn') {
      func = console.warn;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[30m\x1b[103m";
        closer = "\x1b[0m";
      }
    }
    else
      func = console.log;
    if (func)
      func(`${opener}[${(new Date()).toUTCString()}]${closer}`, ...args);
  }
  
  /**
   * Shortcut function for reporting an error. Errors should be reported when something erroneous happens, that will prevent the application from operating normally from that point forward.
   */
  static logError(...args) {
    this.log('error', ...args);
  }
  
  /**
   * Shortcut function for reporting a warning. Warnings should be reported when something erroneous happens, but the application can ignore the error and still operate normally afterward.
   */
  static logWarn(...args) {
    this.log('warn', ...args);
  }
  
  /**
   * Shortcut function for logging a message. Such messages should be logged occasionally to give the application host feedback to verify that the bot is working.
   */
  static logInfo(...args) {
    this.log('info', ...args);
  }
  
  /**
   * Import JSON data. Note that for some utterly baffling reason, EMCAScript *still* has no official method for importing a JSON file, so this "experimental" method will result in a warning in the application console.
   */
  static async importJSON(filename) {
    return (await import(await this.toModulePath(filename), {with: {type: 'json'}}))?.default;
  }
  
  /**
   * A wrapper for the native import operation that catches errors to prevent the application from crashing when trying to import non-essential modules.
   */
  static async safeImport(filename, options) {
    try {
      await fs.access(filename);
    }
    catch(err) {
      this.logWarn(`File '${filename}' is not accessible for import.`, err);
      return undefined;
    }
    
    let filepath = await this.toModulePath(filename);
    
    try {
      let module = await import(filepath, options);
      if (!module)
        this.logWarn(`File '${filepath}' is not a Node.js module.`);
      return module;
    }
    catch(err) {
      this.logWarn(`File '${filepath}' cannot be imported by Node.js.`, err);
      return undefined;
    }
  }
  
  /**
   * Converts a file path relative to the application directory into an absolute file path for use in the native import operation.
   */
  static async toModulePath(filename) {
    let filepath = await fs.realpath(filename);
    if (process.platform === 'win32')
      filepath = 'file://' + filepath;
    return filepath;
  }
}
