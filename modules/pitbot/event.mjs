import { addTimeout } from './manager.mjs';
import * as Messages from './messageTemplates.mjs';

/**
 * @this discord.js/Client
 * @param {discord.js/Message} message - Any message the bot sees.
 */
export async function messageCreate(message) {
  if (message.partial)
    message = await message.fetch();
  
  if (message.author.bot)
    return;
  
  let args = message.content.split(/\s+/g);
  if (args[0] === '!bh') {
    await handleBulletHell.call(this, message);
  }
}

export async function getModerators(guild) {
  let moderatorIds = [];
  let roleIds = this.master.modules.pitbot.options.modRoleId;
  if(!Array.isArray(roleIds))
    roleIds = [roleIds];
  for(let roleId of roleIds) {
    let role = await guild.roles.fetch(roleId);
    for(let [moderatorId, moderator] of role.members) {
      this.master.logDebug(`Moderator:`, moderator.user.username);
      if (!moderatorIds.includes(moderator.user.id))
        moderatorIds.push(moderator.user.id);
    }
  }
  return moderatorIds;
}

/**
 * @this discord.js/Client
 * @param {discord.js/Message} message - The `!bh` message the user typed.
 */
async function handleBulletHell(message) {
  if (Math.random() >= 0.5) {
    message.reply(await Messages.bulletHell.call(this, message));
  }
  else {
    let moderatorIds = await getModerators.call(this, message.guild);
    this.master.logDebug(`moderators:`, moderatorIds);
    let moderatorId = moderatorIds[Math.floor(Math.random()*moderatorIds.length)];
    let moderator = await this.users.fetch(moderatorId);
    
    let prefixes = ['GIGA'];
    let prefix = prefixes[Math.floor(Math.random()*prefixes.length)];
    
    let suffixes = ['HELL'];
    let suffix = suffixes[Math.floor(Math.random()*suffixes.length)];
    
    let bullet = `${prefix} bullet of ${suffix}`;
    
    //let duration = 3600000*Math.floor(Math.random()*24);
    let duration = 10000;
    
    addTimeout.call(this, 'bullethell', {userId:message.author.id, duration});
    message.reply(await Messages.bulletHell.call(this, message, moderator, {bullet, duration}));
  }
}
