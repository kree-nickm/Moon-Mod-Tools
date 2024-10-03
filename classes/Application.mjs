/** @module classes/Application */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Contains methods that pertain to any Node.js application, regardless of what the application's purpose is.
 */
export default class Application {
  static parseCmdLine({flagPrefix='-', optionPrefix='--'}={}) {
    let options = {};
    let lastArgs = '';
    for (let arg of process.argv.slice(2)) {
      if(arg.startsWith(optionPrefix)) {
        lastArgs = [arg.slice(optionPrefix.length)];
        lastArgs.forEach(a => options[a] = options[a] ?? true);
      }
      else if(arg.startsWith(flagPrefix)) {
        lastArgs = arg.split('').slice(flagPrefix.length);
        lastArgs.forEach(a => options[a] = options[a] ?? true);
      }
      else {
        if (lastArgs)
          lastArgs.forEach(a => options[a] = options[a] ?? arg);
        else
          options[arg] = true;
      }
    }
    return options;
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
      else
        midway = " [DEBUG]";
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
  
  //---------------------------------------------------------------------------
  
  static imports = {};
  
  static debugMode;
  
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
    if(this.debugMode)
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
    
    let fileabs = path.resolve(filename);
    if (this.imports[fileabs] && !options.reload)
      return this.imports[fileabs];
    
    if ('reload' in options)
      delete options.reload;
    
    try {
      let append = '?t='+Date.now();
      let filepath = this.toModulePath(filename, append);
      this.logDebug(`Importing file '${filepath}'.`);
      this.imports[fileabs] = await import(filepath, options);
      return this.imports[fileabs];
    }
    catch(err) {
      this.logError(`File '${filename}${append}' cannot be imported by Node.js.`, err);
      return;
    }
  }
}
