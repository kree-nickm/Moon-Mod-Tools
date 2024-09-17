/**
 * Event handlers for Discord.js events that pitbot listens for.
 * @module modules/pitbot/events
 */
import { updateRole, getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function guildMemberAdd(member) {
  // TODO: When someone joins, update their roles.
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
    let moderatorIds = await getModeratorIds.call(this);
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
    
    await this.master.modules.pitbot.database.run('INSERT INTO bullethell (userId, duration, date) VALUES (?, ?, ?)', message.author.id, duration, Date.now());
    await updateRole.call(this, message.author.id);
    await message.reply(await Messages.bulletHell.call(this, message, moderator, {bullet, duration}));
  }
}
