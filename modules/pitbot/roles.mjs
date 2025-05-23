/**
 * Functions for managing the pit role and fetching moderators.
 * @module modules/pitbot/roles
 */
import PitReport from './PitReport.mjs';
import * as Messages from './messageTemplates.mjs';
import * as Util from '../../imports/util.mjs';

/**
 * Database row for a strike.
 * @typedef {Object} Strike
 * @property {number} strikeId - ID of the strike, which corresponds to the database row ID.
 * @property {string} userId - Snowflake ID of the user who was struck.
 * @property {string} modId - Snowflake ID of the mod who issued the strike.
 * @property {number} severity - Severity of the strike.
 * @property {string} comment - Reason for the strike.
 * @property {number} date - Unix timestamp of the strike in milliseconds.
 * @property {boolean} expired - Whether the strike has expired and been marked as such.
 */

/**
 * @typedef {Object} StrikeReport
 * @property {Strike[]} active - List of active strikes, most recent first.
 * @property {Strike[]} expired - List of expired strikes, most recent first.
 * @property {Strike[]} removed - List of removed strikes, most recent first.
 * @property {Strike[]} releases - List of releases, most recent first.
 * @property {number} releaseTime - Unix timestamp (milliseconds) of when the user was or will be freed from the pit due to their most recent active strike, or 0 if they have no active strikes.
 * @property {Strike[]} newlyExpired - List of strikes that just expired.
 * @property {string} durationString - The duration of the strike as a readable string, e.g. '8 hours'
 */

/**
 * @this discord.js/Client
 */
export async function updateRole(userId, source) {
  let module = this.master.modules.pitbot;
  
  let report = await PitReport.create(userId, {module});
  let lastPit = report.getCurrentPit();
  // TODO: If source=='severity', might need to inform the user if this change results in a change to their timeout.
  
  // Create the reason string. Leave blank for sources that have already sent a message.
  let reason = '';
  if (lastPit?.pitted) {
    if (!['add','release','pit'].includes(source))
      reason = lastPit.type === 'strike'
        ? `Strike ID:\`${lastPit.entry.strikeId}\` Lvl ${lastPit.entry.severity} issued by <@${lastPit.entry.modId}>\n> ${lastPit.entry.comment}`
        : lastPit.type === 'bullethell'
        ? `Bullet Hell: ${lastPit.entry.messageLink}`
        : lastPit.type === 'selfpit'
        ? `Self pit`
        : `Timeout issued by <@${lastPit.entry.modId}>\n> ${lastPit.entry.comment??'*No reason given.*'}`;
    
    // Alter the reason string for new joins.
    if (source === 'guildMemberAdd')
      reason = `User rejoined server while pitted. Original reason:\n${reason}`;
  }
  else {
    if (!['add','release','pit'].includes(source))
      reason = !lastPit
        ? `Pit reason unknown`
        : lastPit.type === 'strike'
        ? `Strike time served`
        : lastPit.type === 'release'
        ? `Released by <@${lastPit.entry.modId}>`
        : lastPit.type === 'bullethell'
        ? `Bullet Hell expired`
        : lastPit.type === 'selfpit'
        ? `Self pit expired`
        : `Timeout expired`;
  }
  
  // Set role, which will send a message if reason is not blank.
  await setPitRole.call(this, userId, lastPit?.pitted, {
    reason,
    channelId: lastPit?.type === 'bullethell'
      ? module.options.spamChannelId
      : module.options.logChannelId,
  });
  return report;
}

/**
 * @this discord.js/Client
 */
async function setPitRole(userId, add, {reason='', release, channelId}={}) {
  let module = this.master.modules.pitbot;
  let user = await this.users.fetch(userId);
  let logChannel = await this.channels.fetch(channelId ?? module.options.logChannelId);
  let member = await logChannel.guild.members.fetch(user).catch(err => null/*this.master.logWarn(`Tried to update pit role on a non-member ${userId}.`, err)*/);
  if (!member?.id) {
    return;
  }
  
  let role = await logChannel.guild.roles.fetch(module.options.pitRoleId);
  
  if (add && !role.members.has(member.id)) {
    try {
      await member.roles.add(role);
      if (reason)
        await logChannel.send(await Messages.pitNotice.call(this, user, true, reason, release));
    }
    catch(err) {
      this.master.logError(`Failed to add '${role.name}' to ${user.username}:`, err);
      await logChannel.send(`I couldn't add '${role.name}' to ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
    }
  }
  
  if (!add && role.members.has(member.id)) {
    try {
      await member.roles.remove(role);
      if (reason)
        await logChannel.send(await Messages.pitNotice.call(this, user, false, reason, release));
    }
    catch(err) {
      this.master.logError(`Failed to remove '${role.name}' from ${user.username}:`, err);
      await logChannel.send(`I couldn't remove '${role.name}' from ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
    }
  }
}

/**
 * @this discord.js/Client
 */
export async function updateAllRoles() {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let userIds = [];
  
  let bullethell = await module.database.all('SELECT userId FROM bullethell');
  for(let row of bullethell) {
    userIds.push(row.userId);
  }
  
  let strikes = await module.database.all('SELECT userId FROM strikes WHERE expired=0');
  for(let row of strikes) {
    userIds.push(row.userId);
  }
  
  let role = await logChannel.guild.roles.fetch(module.options.pitRoleId);
  for(let [memberId, member] of role.members) {
    userIds.push(memberId);
  }
  
  userIds = [...new Set(userIds)];
  this.master.logDebug(`Checking roles for ${userIds.length} users: ${bullethell.length} from !bh, ${strikes.length} from strikes, ${role.members.size} from role.`);
  let reports = await Promise.all(userIds.map(userId => updateRole.call(this, userId, 'updateAllRoles')));
  let expiredStrikes = [];
  for (let report of reports)
    expiredStrikes = expiredStrikes.concat(await report.getNewlyExpired());
  if (expiredStrikes.length) {
    await logChannel.send(await Messages.strikesExpired.call(this, {expiredStrikes}));
  }
}

export async function getModeratorIds(includeOwner=false) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let moderatorIds = [];
  
  if (includeOwner && this.master.config.ownerId)
    moderatorIds.push(this.master.config.ownerId);
  
  let roleIds = module.options.modRoleId;
  if(!Array.isArray(roleIds))
    roleIds = [roleIds];
  for(let roleId of roleIds) {
    let role = await logChannel.guild.roles.fetch(roleId);
    for(let [moderatorId, moderator] of (role?.members??[])) {
      //this.master.logDebug(`Moderator:`, moderator.user.username);
      if (!moderatorIds.includes(moderator.user.id))
        moderatorIds.push(moderator.user.id);
    }
  }
  return moderatorIds;
}
