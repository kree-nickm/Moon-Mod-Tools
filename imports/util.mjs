/**
 * Utility functions that are used throughout the bot code.
 * @module imports/util
 */

export function durationString(ms, {abbr=false}={}) {
  if (ms > (86400000 * 365) * 2)
    return `${(ms/(86400000 * 365)).toFixed(1)}` + (abbr ? 'y' : ' years');
  else if (ms > (86400000 * 30) * 3)
    return `${Math.round(ms/(86400000 * 30))}` + (abbr ? 'mo' : ' months');
  else if (ms > 86400000 * 3)
    return `${Math.round(ms/86400000)}` + (abbr ? 'd' : ' days');
  else if (ms > 3600000 * 3)
    return `${Math.round(ms/3600000)}` + (abbr ? 'h' : ' hours');
  else if (ms > 60000 * 3)
    return `${Math.round(ms/60000)}` + (abbr ? 'min' : ' minutes');
  else
    return `${Math.round(ms/1000)}` + (abbr ? 's' : ' seconds');
};
