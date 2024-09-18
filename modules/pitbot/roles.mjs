/**
 * Functions for managing the pit role and fetching moderators.
 * @module modules/pitbot/roles
 */
import * as Messages from './messageTemplates.mjs';

let severityDuration = {
  '1': 3600000*4,
  '2': 3600000*8,
  '3': 3600000*12,
  '4': 3600000*24,
  '5': 3600000*48,
};

let previousSeverityDuration = {
  '1': 3600000*1,
  '2': 3600000*4,
  '3': 3600000*9,
  '4': 3600000*24,
  '5': 3600000*48,
};

let activeStrikeFactor = {
  '1': 1,
  '2': 1.05,
  '3': 1.1,
  '4': 1.3,
  '5': 10,
};

/**
 * @typedef {Object} Strike
 * @property {number} strikeId - ID of the strike, which corresponds to the database row ID.
 * @property {string} userId - Snowflake ID of the user who was struck.
 * @property {string} modId - Snowflake ID of the mod who issued the strike.
 * @property {number} severity - Severity of the strike.
 * @property {string} comment - Reason for the strike.
 * @property {number} date - Unix timestamp of the strike in milliseconds.
 */
/**
 * @typedef {Object} StrikeReport
 * @property {Strike[]} active - List of active strikes, most recent first.
 * @property {Strike[]} expired - List of expired strikes, most recent first.
 * @property {Strike[]} removed - List of removed strikes, most recent first.
 * @property {Strike[]} releases - List of releases, most recent first.
 * @property {number} releaseTime - Unix timestamp (milliseconds) of when the user was or will be freed from the pit due to their most recent active strike, or 0 if they have no active strikes.
 */
/**
 * @param {string} userId - Snowflake ID of the user whose strike data to fetch.
 * @this discord.js/Client
 * @returns {StrikeReport} A report of all of the users strikes and releases.
 */
export async function getStrikes(userId) {
  let module = this.master.modules.pitbot;
  let active = [];
  let expired = [];
  let removed = [];
  let releases = [];
  
  let strikes = await module.database.all('SELECT rowId AS strikeId,* FROM strikes WHERE userId=? ORDER BY date DESC', userId);
  for(let strike of strikes) {
    // Severity < 0 means it's a mod explicitly releasing a user from the pit, regardless of their previous strikes.
    if (strike.severity < 0) {
      releases.push(strike);
      continue;
    }
    
    // Severity = 0 means the strike was removed. It could be deleted from the database entirely in the future.
    if (strike.severity === 0) {
      removed.push(strike);
      continue;
    }
    
    // A strike is active if it was issued in the last month, or if it was issued less than a month before the next most recent active strike. (2592000000 milliseconds in a month)
    let isActive = (strike.date > (Date.now() - 2592000000))
      || active.length && (strike.date > (active[active.length-1].date - 2592000000));
    
    if(isActive)
      active.push(strike);
    else
      expired.push(strike);
  }
  
  let releaseTime = 0;
  if (active.length) {
    let duration = 0;
    for(let strike of active) {
      if (!duration)
        duration = severityDuration[strike.severity];
      else
        duration += previousSeverityDuration[strike.severity];
    }
    duration *= activeStrikeFactor[Math.min(active.length, 5)];
    releaseTime = active[0].date + duration;
  }
  
  return {active, expired, removed, releases, releaseTime};
}

/**
 * @this discord.js/Client
 */
export async function updateRole(userId) {
  let module = this.master.modules.pitbot;
  let strikes = await getStrikes.call(this, userId);
  
  // Check if they are currently pitted from bullet hell, taking into account if a mod released them as above.
  await module.database.run('DELETE FROM bullethell WHERE userId=? AND date+duration<?', userId, Date.now());
  let bullethell = await module.database.all('SELECT * FROM bullethell WHERE userId=? AND date>?', userId, strikes.releaseTime);
  
  // Apply any suspension that we determined.
  if (strikes.releaseTime > Date.now()) {
    let strike = strikes.active[0];
    await setPitRole.call(this, userId, true, `Strike ID:\`${strike.strikeId}\` Lvl ${strike.severity} issued by <@${strike.modId}>\n> ${strike.comment}`);
  }
  else if (bullethell.length) {
    await setPitRole.call(this, userId, true, 'Bullet Hell');
  }
  else {
    await setPitRole.call(this, userId, false);
  }
  return { strikes, bullethell };
}

/**
 * @this discord.js/Client
 */
async function setPitRole(userId, add=true, reason='') {
  let module = this.master.modules.pitbot;
  let user = await this.users.fetch(userId);
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let member = await logChannel.guild.members.fetch(user);
  let role = await logChannel.guild.roles.fetch(module.options.pitRoleId);
  
  if (add && !role.members.has(member.id)) {
    try {
      await member.roles.add(role);
      await logChannel.send(await Messages.pitNotice.call(this, user, true, reason));
    }
    catch(err) {
      this.master.logError(`Failed to add '${role.name}' to ${user.username}:`, err);
      await logChannel.send(`I couldn't add '${role.name}' to ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
    }
  }
  
  if (!add && role.members.has(member.id)) {
    try {
      await member.roles.remove(role);
      await logChannel.send(await Messages.pitNotice.call(this, user, false, reason));
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
  let userIds = [];
  
  let bullethell = await module.database.all('SELECT userId FROM bullethell');
  for(let row of bullethell)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
  await module.database.run('DELETE FROM bullethell WHERE date+duration<?', Date.now());
    
  let strikes = await module.database.all('SELECT userId FROM strikes');
  for(let row of strikes)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
  
  for(let userId of userIds)
    await updateRole.call(this, userId);
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
    for(let [moderatorId, moderator] of role.members) {
      this.master.logDebug(`Moderator:`, moderator.user.username);
      if (!moderatorIds.includes(moderator.user.id))
        moderatorIds.push(moderator.user.id);
    }
  }
  return moderatorIds;
}
