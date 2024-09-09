/**
 * All of the templates for messages sent by the pitbot module.
 * @module modules/pitbot/messageTemplates
 */

/**
 * Message sent to the channel when a user survives bullet hell.
 * @this discord.js/Client
 * @param {discord.js/Message} message - The `!bh` message the user typed.
 * @param {?discord.js/User} [moderator] - The moderator credited for the bullet, or null if the bullets all missed.
 * @param {Object} [options] - Options for the message and timeout.
 * @param {string} [options.bullet='bullet'] - Custom name of the bullet that hit.
 * @param {number} [options.duration=3600000] - Duration of the timeout in milliseconds.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function bulletHell(message, moderator=null, {bullet='bullet',duration=3600000}={}) {
  let response = {
    embeds: [{
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    }],
  };
  
  if  (moderator) {
    response.embeds[0].title = `Bullet Hell Winner`;
    response.embeds[0].description = `${message.author} was hit by ${moderator}'s ${bullet}. BACK TO THE PIT for ${Math.round(duration/3600000)} hours.`;
  }
  else {
    response.embeds[0].title = `Bullet Hell Loser`;
    response.embeds[0].description = `Mods missed every bullet. ${message.author}'s misery is unending.`;
  }
  
  return response;
}

export async function pitNotice(user, added, reason) {
  let response = {
    embeds: [],
  };
  
  if (added) {
    response.embeds.push({
      title: 'User Pitted',
      color: 0xff0000,
      description: `User ${user} was just sent to the pit.`,
      timestamp: new Date().toISOString(),
    });
  }
  else {
    response.embeds.push({
      title: 'User Released',
      color: 0x00ff00,
      description: `User ${user} was just released from the pit.`,
      timestamp: new Date().toISOString(),
    });
  }
  
  if (reason) {
    response.embeds[0].fields = [
      {
        name: 'Reason',
        value: reason,
      },
    ];
  }
  
  return response;
}

export async function maximumStrikes(user) {
  let response = {
    embeds: [{
      title: 'User With 5 Strikes',
      description: `${user} has reached the 5 active strike limit.`,
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

export async function strikeConfirmation(user, mod, severity, comment, releaseDate) {
  let response = {
    embeds: [{
      title: 'Strike Issued',
      timestamp: new Date().toISOString(),
    }],
    ephemeral: true,
  };
  
  return response;
}

export async function strikeNotification(severity, comment, releaseDate) {
  let response = {
    embeds: [{
      title: 'You have received a strike.',
      /*footer: {
        text: 'Mod Team',
        //icon_url: ticket.guild.iconURL(),
      },*/
      timestamp: new Date().toISOString(),
    }],
    ephemeral: true,
  };
  
  return response;
}
