import { addRow } from './manager.mjs';
import * as Messages from './messageTemplates.mjs';

async function getModeratorIds(guild) {
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
 * @param {discord.js/Message} message - Any message the bot sees.
 */
export async function messageCreate(message) {
  if (message.partial)
    message = await message.fetch();
  
  if (message.author.bot)
    return;
  
  let args = message.content.split(/\s+/g);
  if (args[0] === '!bh')
    return await handleBulletHell.call(this, message);
  
  let isModerator = message.author.id === this.master.config.ownerId || (await getModeratorIds.call(this, message.guild)).includes(message.author.id);
  
  if (args[0] === '!strikes') {
    if (isModerator)
      return;
    return;
  }
  
  if (args[0] === '!release') {
    if (isModerator)
      return;
    return;
  }
  
  if (args[0] === '!removestrike') {
    if (isModerator)
      return;
    return;
  }
  
  if (args[0] === '!editcomment') {
    if (isModerator)
      return;
    return;
  }
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
    let moderatorIds = await getModeratorIds.call(this, message.guild);
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
    
    addRow.call(this, 'bullethell', {userId:message.author.id, duration});
    message.reply(await Messages.bulletHell.call(this, message, moderator, {bullet, duration}));
  }
}

/*
PitBot
A "timeout" command that adds the "BACKTOTHEPIT" role to a user for a specified amount of time. If no time is provided, the role is added indefinitely.
  Timeouts save a "strike" against the user in their discipline history alongside the comment, date, issuer, and duration of the strike.
Whenever moderation action is taken against a user, that user is notified by the bot including the duration of their timeout, the comment provided, their active strikes, but not the issuer.
Strikes decay off users from "active" to "inactive" after a certain amount of time of no disciplinary action. The details of this decay can be found here: ⁠🌙 ²⁠.
Mods can check a user's punishment history, release a user from a timeout prematurely, and remove/edit strikes with their own commands:
!strikes <user>
!release <optional:amend>
!removestrike <strikeID>
!editcomment <strikeID> <comment> respectively
*/
