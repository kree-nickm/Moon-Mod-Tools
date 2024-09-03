import * as Messages from './messageTemplates.mjs';

/**
 * @this discord.js/Client
 */
export async function addTimeout(table, {userId,duration,severity,modId,comment}={}) {
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
  let user = await this.users.fetch(userId);
  let logChannel = await this.channels.fetch(this.master.modules.pitbot.options.logChannelId);
  let member = await logChannel.guild.members.fetch(user);
  let role = await logChannel.guild.roles.fetch(this.master.modules.pitbot.options.pitRoleId);
  
  await this.master.modules.pitbot.database.run('DELETE FROM bullethell WHERE date+duration<?', Date.now());
  let bullethell = await this.master.modules.pitbot.database.all('SELECT * FROM bullethell WHERE userId=?', userId);
  if (bullethell.length) {
    if (!role.members.has(member.id)) {
      try {
        await member.roles.add(role);
        await logChannel.send(await Messages.pitAdded.call(this, user, 'bullet hell'));
      }
      catch(err) {
        this.master.logError(`Failed to add '${role.name}' to ${user.username}:`, err);
        await logChannel.send(`I couldn't add '${role.name}' to ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
      }
      return;
    }
  }
  
  if (role.members.has(member.id)) {
    try {
      await member.roles.remove(role);
      await logChannel.send(await Messages.pitRemoved.call(this, user));
    }
    catch(err) {
      this.master.logError(`Failed to remove '${role.name}' from ${user.username}:`, err);
      await logChannel.send(`I couldn't remove '${role.name}' from ${user.username}. Perhaps I don't have MANAGE_ROLE permission? :(`);
    }
  }
}

export async function updateAllRoles() {
  let userIds = [];
  
  let bullethell = await this.master.modules.pitbot.database.all('SELECT * FROM bullethell');
  for(let row of bullethell)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
    
  let strikes = await this.master.modules.pitbot.database.all('SELECT * FROM strikes');
  for(let row of strikes)
    if(!userIds.includes(row.userId))
      userIds.push(row.userId);
  
  for(let userId of userIds) {
    await updateRole.call(this, userId);
  }
}
