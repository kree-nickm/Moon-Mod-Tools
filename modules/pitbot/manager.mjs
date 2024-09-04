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
export async function addRow(table, {userId,duration,severity,modId,comment}={}) {
  if (table === 'bullethell')
    await this.master.modules.pitbot.database.run('INSERT INTO bullethell (userId, duration, date) VALUES (?, ?, ?)', userId, duration, Date.now());
  if (table === 'strikes')
    await this.master.modules.pitbot.database.run('INSERT INTO strikes (userId, modId, comment, severity, date) VALUES (?, ?, ?, ?, ?)', userId, modId, comment, severity, Date.now());
  if (table === 'warnings')
    await this.master.modules.pitbot.database.run('INSERT INTO warnings (userId, modId, comment, date) VALUES (?, ?, ?, ?)', userId, modId, comment, Date.now());
  
  await updateRole.call(this, userId);
}

/**
 * @this discord.js/Client
 */
export async function updateRole(userId) {
  // Figure out what level of suspension they should have based on their strikes, if any.
  let pitDuration = 0;
  let released = 0;
  let activeStrikeCount = 0;
  let mostRecentStrikeDate = 0;
  let nextMostRecentActiveStrikeDate = 0;
  let strikes = await this.master.modules.pitbot.database.all('SELECT * FROM strikes WHERE userId=? ORDER BY date DESC', userId);
  for(let strike of strikes) {
    // Severity < 0 means it's a mod explicitly releasing a user from the pit, regardless of their previous strikes. Only note their most recent release.
    if (strike.severity < 0) {
      if (!released)
        released = strike.date;
      continue;
    }
    
    // A strike is active if it was issued in the last month, or if it was issued less than a month before the next most recent active strike. (2592000000 milliseconds in a month)
    let isActive = (strike.date > (Date.now() - 2592000000)) || nextMostRecentActiveStrikeDate && (strike.date > (nextMostRecentActiveStrikeDate - 2592000000));
    
    // Duration starts counting from the most recent strike.
    if (!mostRecentStrikeDate)
      mostRecentStrikeDate = strike.date;
    if (!pitDuration) {
      if (!released)
        pitDuration = severityDuration[strike.severity];
    }
    else
      pitDuration += previousSeverityDuration[strike.severity];
    
    // Keep track of active strikes.
    if(isActive) {
      activeStrikeCount++;
      nextMostRecentActiveStrikeDate = strike.date;
    }
  }
  activeStrikeCount = Math.min(activeStrikeCount, 5);
  pitDuration *= activeStrikeFactor[activeStrikeCount];
  let releaseDate = mostRecentStrikeDate + pitDuration;
  if (activeStrikeCount === 5) {
    // TODO: Moderators need to be notified when someone reaches this.
  }
  
  // Check if they are currently pitted from bullet hell, taking into account if a mod released them as above.
  await this.master.modules.pitbot.database.run('DELETE FROM bullethell WHERE userId=? AND date+duration<?', userId, Date.now());
  let bullethell = await this.master.modules.pitbot.database.all('SELECT * FROM bullethell WHERE userId=? AND date>?', userId, released);
  
  // Apply any suspension that we determined.
  if (releaseDate > Date.now())
    await setPitRole.call(this, userId, true, 'Strike(s)');
  else if (bullethell.length)
    await setPitRole.call(this, userId, true, 'Bullet Hell');
  else
    await setPitRole.call(this, userId, false);
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
      await logChannel.send(await Messages.pitAdded.call(this, user, reason));
    }
    catch(err) {
      this.master.logError(`Failed to add '${role.name}' to ${user.username}:`, err);
      await logChannel.send(`I couldn't add '${role.name}' to ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
    }
  }
  
  if (!add && role.members.has(member.id)) {
    try {
      await member.roles.remove(role);
      await logChannel.send(await Messages.pitRemoved.call(this, user, reason));
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
