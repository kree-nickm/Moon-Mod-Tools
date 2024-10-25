/**
 * All of the templates for messages sent by the pitbot module.
 * @module modules/pitbot/messageTemplates
 */

/**
 * Message sent to the channel when a user triggers bullet hell.
 * @this discord.js/Client
 * @param {discord.js/Message} message - The `!bh` message the user typed.
 * @param {?discord.js/User} [moderator] - The moderator credited for the bullet, or null if the user was not hit.
 * @param {Object} [options] - Options for the message and timeout.
 * @param {string} [options.prefix='tarnished'] - Bullet name prefix.
 * @param {string} [options.suffix='of no renown'] - Bullet name suffix.
 * @param {number} [options.duration=3600000] - Duration of the timeout in milliseconds.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function bulletHell(message, moderator=null, {prefix='tarnished',suffix='of no renown',duration=3600000}={}) {
  let response = {
    embeds: [{
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    }],
  };
  
  if  (moderator) {
    response.embeds[0].title = `Bullet Hell Winner`;
    response.embeds[0].description = `${message.author} was hit by ${moderator}'s ${prefix} bullet ${suffix}. BACK TO THE PIT for ${Math.round(duration/3600000)} hours.`;
  }
  else {
    response.embeds[0].title = `Bullet Hell Loser`;
    response.embeds[0].description = `Mods missed every bullet. ${message.author}'s misery is unending.`;
  }
  
  return response;
}

/**
 * Automated message for when a user was released from or sent to the pit.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user being released from or sent to the pit.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function pitNotice(user, added, reason, release) {
  let response = {
    embeds: [],
  };
  
  if (added) {
    response.embeds.push({
      title: 'User Pitted',
      color: 0xff0000,
      description: `User ${user} was just sent to the pit.`,
      timestamp: new Date().toISOString(),
      fields: [],
    });
  }
  else {
    response.embeds.push({
      title: 'User Released',
      color: 0x00ff00,
      description: `User ${user} was just released from the pit.`,
      timestamp: new Date().toISOString(),
      fields: [],
    });
  }
  
  if (reason) {
    response.embeds[0].fields.push({
      name: 'Reason',
      value: reason,
    });
  }
  
  if (release) {
    response.embeds[0].fields.push({
      name: 'Pitted Until',
      value: `<t:${Math.floor(release/1000)}:f>`,
    });
  }
  
  return response;
}

/**
 * Automated message for when a user has reached the maximum number of strikes.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user who has reached maximum strikes.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function maximumStrikes(user) {
  let response = {
    embeds: [{
      title: `User With 5 Strikes`,
      color: 0xff0000,
      description: `${user} has reached the 5 active strike limit.`,
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Message sent to the log channel when a user receives a strike.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user who received a strike.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function strikeConfirmation(user, mod, severity, comment, strikeReport, notifSent) {
  let response = {
    embeds: [{
      title: 'Strike Issued',
      color: 0xff0000,
      description: `${mod} issued a level ${severity} strike to ${user}.\nTimed out for ${strikeReport.durationString}.`,
      fields: [
        {
          name: 'Reason',
          value: comment,
        },
        {
          name: 'Strike ID',
          value: strikeReport.active[0]?.strikeId ?? '???',
          inline: true,
        },
        {
          name: 'Pitted Until',
          value: `<t:${Math.floor(strikeReport.releaseTime/1000)}:f>`,
          inline: true,
        },
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  if (notifSent === false) {
    response.embeds[0].fields.push({
      name: `DM Error`,
      value: `Could not notify ${user} about this strike. They may need to open their DMs from users from the same server.`,
    });
  }
  
  return response;
}

/**
 * Message sent to a user when they have received a strike.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function strikeNotification(guild, severity='', comment='', strikeReport) {
  let response = {
    embeds: [{
      title: `You have received a strike.`,
      color: 0xff0000,
      //description: comment,
      fields: [
        {
          name: 'Reason',
          value: comment,
        },
        {
          name: 'Duration',
          value: `${strikeReport.durationString}`,
          inline: true,
        },
        {
          name: 'Release (Appx)',
          value: `<t:${Math.floor(strikeReport.releaseTime/1000)}:R>`,
          inline: true,
        },
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
      ],
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Message sent to the log channel when a user gets released by a moderator.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user being released from the pit.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function releaseConfirmation(user, mod, amend, strikeReport, notifSent) {
  let response = {
    embeds: [{
      title: 'User Released By Command',
      color: 0x00ff00,
      description: `${mod} released ${user} from the pit.` + (amend ? `\nTheir most recent strike was also removed.` : ''),
      fields: [
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  if (notifSent === false) {
    response.embeds[0].fields.push({
      name: `DM Error`,
      value: `Could not notify ${user} about their release. They may need to open their DMs from users from the same server.`,
    });
  }
  
  return response;
}

/**
 * Message sent to a user when they are released by a moderator.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function releaseNotification(guild, amend, strikeReport) {
  let response = {
    embeds: [{
      title: 'You have been released from the pit.',
      color: 0x00ff00,
      description: amend ? 'Your most recent strike was also removed.' : undefined,
      fields: [
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
      ],
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Reply that is sent if a moderator tries to remove an invalid strike.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function removeFailed(strikeId, strike) {
  let response = {
    ephemeral: true,
    embeds: [{
      title: 'Failed to Remove Strike',
      description: !strike || strike.severity < 0
        ? `No strike found with ID \`${strikeId}\`.`
        : `Strike \`${strikeId}\` has already been removed.`,
    }],
  };
  
  return response;
}

/**
 * Message sent to the log channel when one of a user's strike has been removed.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user whose strike is being removed.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function removeConfirmation(user, mod, strike, strikeReport, notifSent) {
  let response = {
    embeds: [{
      title: 'Strike Removed',
      description: `${mod} removed a strike from ${user}.`,
      fields: [
        {
          name: 'Strike Reason',
          value: strike.comment ?? '*None given.*',
        },
        {
          name: 'Strike ID',
          value: strike.strikeId,
          inline: true,
        },
        {
          name: 'Issuer',
          value: `<@${strike.modId}>`,
          inline: true,
        },
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
        {
          name: 'Strike Date',
          value: `<t:${Math.floor(strike.date/1000)}:f>`,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  if (notifSent === false) {
    response.embeds[0].fields.push({
      name: `DM Error`,
      value: `Could not notify ${user} about this strike removal. They may need to open their DMs from users from the same server.`,
    });
  }
  
  return response;
}

/**
 * Message sent to a user when one of their strikes has been removed.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function removeNotification(guild, strike, strikeReport) {
  let response = {
    embeds: [{
      title: 'A strike was removed.',
      description: 'The listed strike is no longer in your record.',
      fields: [
        {
          name: 'Strike Reason',
          value: strike.comment ?? '*None given.*',
        },
        {
          name: 'Strike Date',
          value: `<t:${Math.floor(strike.date/1000)}:f>`,
        },
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
      ],
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Message sent when a user's strike list is requested.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user whose strikes to list.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function listStrikes(guild, user, strikeReport, {ephemeral,mod}={}) {
  let response = {
    ephemeral,
    embeds: [{
      title: 'Strikes Info',
      description: `List of ${strikeReport.active.length+strikeReport.expired.length} total strikes for ${user}.`,
      fields: [
        {
          name: 'Active Strikes',
          value: strikeReport.active.length,
          inline: true,
        },
        {
          name: 'Expired Strikes',
          value: strikeReport.expired.length,
          inline: true,
        },
        {
          name: 'Last Timeout',
          value: strikeReport.releaseTime ? `<t:${Math.floor(strikeReport.releaseTime/1000)}:f>` : 'Never',
          inline: true,
        },
      ],
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  let componentRow = {
    type: 1,
    components: [],
  };
  let strikeToString = strike => `ID:\`${strike.strikeId}\` Lvl ${strike.severity} on <t:${Math.floor(strike.date/1000)}:d>` + (mod?` by <@${strike.modId}>`:'') + `\n> ${strike.comment}`;
  if (strikeReport.active.length) {
    let content = strikeReport.active.map(strikeToString).join(`\n`);
    response.embeds[0].fields.push({
      name: 'Active Strike List' + (content.length > 1024 ? ' (Shortened)' : ''),
      value: content.slice(0, 1024),
      inline: true,
    });
    if (content.length > 1024) {
      componentRow.components.push({
        type: 2,
        label: 'View All Active',
        style: 2,
        custom_id: 'view_active_strikes',
      });
    }
  }
  if (strikeReport.expired.length) {
    let content = strikeReport.expired.map(strikeToString).join(`\n`);
    response.embeds[0].fields.push({
      name: 'Expired Strike List' + (content.length > 1024 ? ' (Shortened)' : ''),
      value: content.slice(0, 1024),
      inline: true,
    });
    if (content.length > 1024) {
      componentRow.components.push({
        type: 2,
        label: 'View All Expired',
        style: 2,
        custom_id: 'view_expired_strikes',
      });
    }
  }
  
  if (componentRow.components.length)
    response.components = [componentRow];
  
  return response;
}

/**
 * Reply that is sent if a moderator tries to edit the comment of an invalid strike.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function commentFailed(strikeId) {
  let response = {
    ephemeral: true,
    embeds: [{
      title: 'Failed to Edit Comment',
      description: `No strike found with ID \`${strikeId}\`.`,
    }],
  };
  
  return response;
}

/**
 * Message sent to the log channel when a moderator edits a strike comment.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function commentConfirmation(mod, strike, comment) {
  let response = {
    embeds: [{
      title: 'Strike Comment Edited',
      description: `${mod} edited the comment for <@${strike.userId}>'s strike.`,
      fields: [
        {
          name: 'New Comment',
          value: comment ?? '*None given.*',
        },
        {
          name: 'Old Comment',
          value: strike.comment ?? '*None given.*',
        },
        {
          name: 'Strike ID',
          value: strike.strikeId,
          inline: true,
        },
        {
          name: 'Issuer',
          value: `<@${strike.modId}>`,
          inline: true,
        },
        {
          name: 'Strike Date',
          value: `<t:${Math.floor(strike.date/1000)}:f>`,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Message sent to the log channel when a user receives a warning.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user being warned.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function warnConfirmation(user, mod, comment, warnings, notifSent) {
  let response = {
    embeds: [{
      title: 'Warning Issued',
      description: `${mod} issued a warning to ${user}. They now have ${warnings.length} warnings.\n> ${comment}`,
      fields: [],
      timestamp: new Date().toISOString(),
    }],
  };
  
  if (notifSent === false) {
    response.embeds[0].fields.push({
      name: `DM Error`,
      value: `Could not notify ${user} about this warning. They may need to open their DMs from users from the same server.`,
    });
  }
  
  return response;
}

/**
 * Message sent to a user when they have received a warning.
 * @this discord.js/Client
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function warnNotification(guild, comment, warnings) {
  let response = {
    embeds: [{
      title: 'You have received a warning.',
      description: comment,
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

/**
 * Message sent when a user's warning list is requested.
 * @this discord.js/Client
 * @param {discord.js/User} user - The user whose warnings to list.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function listWarnings(guild, user, warnings, {ephemeral,mod}={}) {
  let response = {
    ephemeral,
    embeds: [{
      title: 'Warning Info',
      description: `List of ${warnings.length} warnings for ${user}.`,
      fields: [],
      footer: {
        text: 'Mod Team',
        icon_url: guild.iconURL(),
      },
      timestamp: new Date().toISOString(),
    }],
  };
  
  let componentRow = {
    type: 1,
    components: [],
  };
  let warningToString = warn => `ID:\`${warn.warnId}\` on <t:${Math.floor(warn.date/1000)}:d>` + (mod?` by <@${warn.modId}>`:'') + `\n> ${warn.comment}`;
  if (warnings.length) {
    let content = warnings.map(warningToString).join(`\n`);
    response.embeds[0].fields.push({
      name: 'Warnings List' + (content.length > 1024 ? ' (Shortened)' : ''),
      value: content.slice(0, 1024),
    });
    if (content.length > 1024) {
      componentRow.components.push({
        type: 2,
        label: 'View All',
        style: 2,
        custom_id: 'view_warnings',
      });
    }
  }
  
  if (componentRow.components.length)
    response.components = [componentRow];
  
  return response;
}

/**
 * Message sent to the log channel upon strike(s) expiration.
 * @this discord.js/Client
 * @param {Object} options - Message options.
 * @param {Strike[]} options.expiredStrikes - Array of strike records from the database.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function strikesExpired({expiredStrikes}) {
  let userIds = expiredStrikes.map(strike => strike.userId);
  let users = [...new Set(userIds)].map(userId => `<@${userId}>`).join(' ');
  
  let response = {
    embeds: [{
      title: 'Strikes Expired',
      description: `Total ${expiredStrikes.length} strikes expired for ${users}`,
      fields: [],
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}
