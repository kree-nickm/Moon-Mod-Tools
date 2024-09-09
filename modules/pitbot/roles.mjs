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
 * @this discord.js/Client
 */
export async function getStrikes(userId) {
  let active = [];
  let expired = [];
  let removed = [];
  let releases = [];
  
  let strikes = await this.master.modules.pitbot.database.all('SELECT rowId AS strikeId,* FROM strikes WHERE userId=? ORDER BY date DESC', userId);
  for(let strike of strikes) {
    // Severity < 0 means it's a mod explicitly releasing a user from the pit, regardless of their previous strikes.
    if (strike.severity < 0) {
      releases.push(strike);
      continue;
    }
    
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
  let strikes = await getStrikes.call(this, userId);
  if (strikes.active.length >= 5) {
    let logChannel = await this.channels.fetch(this.master.modules.pitbot.options.logChannelId);
    await logChannel.send(await Messages.maximumStrikes.call(this, user));
  }
  
  // Check if they are currently pitted from bullet hell, taking into account if a mod released them as above.
  await this.master.modules.pitbot.database.run('DELETE FROM bullethell WHERE userId=? AND date+duration<?', userId, Date.now());
  let bullethell = await this.master.modules.pitbot.database.all('SELECT * FROM bullethell WHERE userId=? AND date>?', userId, released);
  
  // Apply any suspension that we determined.
  if (strikes.releaseTime > Date.now()) {
    let mod = this.users.fetch(strikes[0].modId) ?? strikes[0].modId;
    await setPitRole.call(this, userId, true, `Strike (L${strikes[0].severity}) issued by ${mod}: ${strikes[0].comment}`);
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
  let user = await this.users.fetch(userId);
  let logChannel = await this.channels.fetch(this.master.modules.pitbot.options.logChannelId);
  let member = await logChannel.guild.members.fetch(user);
  let role = await logChannel.guild.roles.fetch(this.master.modules.pitbot.options.pitRoleId);
  
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
  let userIds = [];
  
  let bullethell = await this.master.modules.pitbot.database.all('SELECT * FROM bullethell');
  for(let row of bullethell)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
  await this.master.modules.pitbot.database.run('DELETE FROM bullethell WHERE date+duration<?', Date.now());
    
  let strikes = await this.master.modules.pitbot.database.all('SELECT * FROM strikes');
  for(let row of strikes)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
  
  for(let userId of userIds)
    await updateRole.call(this, userId);
}

export async function getModeratorIds(includeOwner=false) {
  let logChannel = await this.channels.fetch(this.master.modules.pitbot.options.logChannelId);
  let moderatorIds = [];
  
  if (includeOwner && this.master.config.ownerId)
    moderatorIds.push(this.master.config.ownerId);
  
  let roleIds = this.master.modules.pitbot.options.modRoleId;
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
