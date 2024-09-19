/** @module classes/Application */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Contains methods that pertain to any Node.js application, regardless of what the application's purpose is.
 */
export default class Application {
  /**
   * Object with keys as flags, and values are the option(s) of those flags in the command line.
   * @type {Object.<string, string>}
   */
  static options = {};
  
  static debugMode;
  
  /**
   * Parses the command line via which this Node.js application was started into an object whose keys are option flags, and their associated values are the argument that followed the flag. Assumes the first argument is a flag, and the next is an option value, alternating until all arguments are iterated through. If there are an odd number of arguments, the last one will be stored in the options object with the `_last` key.
   * @param {Object} [options] - Additional instructions on how certain flags should be handled.
   * @param {string[]} [options.multiples] - Array of flags that will be stored as arrays in the returned object, and repeats of that flag in the command line will be added to the corresponding array.
   * @param {Object.<string, string[]>} [options.aliases] - Object with each key being a flag, and the value is an array of flags that will be considered duplicates of the flag in the key.
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
   * @param {string} type - Type of message to log to the console.
   * @param {...*} args - The data to log.
   */
  static log(type, ...args) {
    let func;
    let opener = "";
    let midway = "";
    let closer = "";
    if (type === 'error') {
      func = console.error;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[40m\x1b[91m";
        midway = "\x1b[0m\x1b[91m";
        closer = "\x1b[0m";
      }
      else
        midway = " [ERROR]";
    }
    else if (type === 'warn') {
      func = console.warn;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[40m\x1b[93m";
        midway = "\x1b[0m\x1b[93m";
        closer = "\x1b[0m";
      }
      else
        midway = " [WARN]";
    }
    else if (type === 'debug') {
      func = console.debug;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[40m\x1b[90m";
        midway = "\x1b[0m\x1b[90m";
        closer = "\x1b[0m";
      }
      else if(this.debugMode)
        midway = " [DEBUG]";
      else
        return;
    }
    else if (type === 'info') {
      func = console.log;
      if (process.title === "Windows PowerShell") {
        opener = "\x1b[40m";
        midway = "\x1b[0m";
        closer = "";
      }
    }
    else
      func = console.log;
    if (func)
      func(`${opener}[${(new Date()).toUTCString()}]${midway}`, ...args, closer);
  }
  
  /**
   * Shortcut function for reporting an error. Errors should be reported when the current operation cannot be completed.
   * @param {...*} args - The data to log.
   */
  static logError(...args) {
    this.log('error', ...args);
  }
  
  /**
   * Shortcut function for reporting a warning. Warnings should be reported when the current operation can still be completed, but might not work exactly as the user intended.
   * @param {...*} args - The data to log.
   */
  static logWarn(...args) {
    this.log('warn', ...args);
  }
  
  /**
   * Shortcut function for logging a message. Messages should be logged occasionally to give the owner feedback to verify that the bot is working.
   * @param {...*} args - The data to log.
   */
  static logInfo(...args) {
    this.log('info', ...args);
  }
  
  /**
   * Shortcut function for logging a debug message. Will only output the message in a development environment.
   * @param {...*} args - The data to log.
   */
  static logDebug(...args) {
    this.log('debug', ...args);
  }
  
  /**
   * Import JSON data. Note that for some utterly baffling reason, EMCAScript *still* has no official method for importing a JSON file, so this "experimental" method will result in a warning in the application console.
   * @param {string} filename - JSON file name or path relative to the application's install directory.
   * @returns {*} - The parsed data from the JSON file.
   */
  static async importJSON(filename) {
    return (await this.safeImport(filename, {with: {type: 'json'}}))?.default;
  }
  
  /**
   * A wrapper for the native import operation that catches errors to prevent the application from crashing when trying to import non-essential modules.
   * @param {string} filename - File name or path relative to the application's install directory.
   * @param {Object} [options] - Options to send to the native import operation, with some extras noted below.
   * @param {boolean} [options.reload] - If true, the module will be imported again, rather than using the cache.
   * @returns {Object} - The imported Node.js module.
   */
  static async safeImport(filename, options={}) {
    try {
      await fs.access(filename);
    }
    catch(err) {
      this.logError(`File '${filename}' is not accessible for import.`, err);
      return;
    }
    
    let append = '';
    if ('reload' in options) {
      if (options.reload)
        append = '?t='+Date.now();
      delete options.reload;
    }
    
    try {
      let filepath = this.toModulePath(filename, append);
      this.logDebug(`Importing file '${filepath}'.`);
      return await import(filepath, options);
    }
    catch(err) {
      this.logError(`File '${filename}${append}' cannot be imported by Node.js.`, err);
      return;
    }
  }
  
  /**
   * Converts any file path into a path that the native import operation will accept.
   * @param {string} filename - JavaScript file name or path relative to the application's install directory.
   * @param {string} [append] - A query string to append to the returned path.
   * @returns {string} - A full path with prefix for use in the Node.js import operation.
   */
  static toModulePath(filename, append='') {
    return "file:" + path.resolve(filename) + append;
  }
}
