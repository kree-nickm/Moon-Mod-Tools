/**
 * Event handlers for Discord.js events that pitbot listens for.
 * @module modules/pitbot/events
 */
import { updateRole, getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';
import * as Strikes from './strikeManager.mjs';
import * as Warns from './warnManager.mjs';

export async function guildMemberAdd(member) {
  await updateRole.call(this, member.id);
}

export async function guildMemberUpdate(oldMember, member) {
  let module = this.master.modules.pitbot;
  if(oldMember?.roles?.cache.has(module.options.pitRoleId) && !member.roles.cache.has(module.options.pitRoleId)) {
    // TODO: Do an implicit !release, except we can't know who the mod is that did it. Will need to use audit log for that.
    this.master.logDebug(`${member.user.username}'s pit role manually removed.`);
  }
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
  
  let isModerator = (await getModeratorIds.call(this, true)).includes(message.author.id);
  
  if (args[0] === '!timeout') {
    if (isModerator && args.length > 3) {
      let user = await this.users.fetch(args[1].replace(/[^0-9]/g, ''));
      let severity = parseInt(args[2]);
      let comment = args.slice(3).join(' ');
      return Strikes.add.call(this, user, message.author, severity, comment);
    }
    return;
  }
  
  if (args[0] === '!release') {
    if (isModerator && args.length > 1) {
      let user = await this.users.fetch(args[1].replace(/[^0-9]/g, ''));
      let amend = args.length > 2 && args[2] == 'amend';
      return Strikes.release.call(this, user, message.author, amend);
    }
    return;
  }
  
  if (args[0] === '!strikes') {
    let user;
    let mod = isModerator ? message.author : undefined;
    if (isModerator && args.length > 1)
      user = (await this.users.fetch(args[1].replace(/[^0-9]/g, ''))) ?? message.author;
    else
      user = message.author;
    return Strikes.list.call(this, user, mod, {message});
  }
  
  if (args[0] === '!removestrike') {
    if (isModerator && args.length > 1) {
      let strikeId = parseInt(args[1]);
      return Strikes.remove.call(this, strikeId, {message});
    }
    return;
  }
  
  if (args[0] === '!editcomment') {
    if (isModerator && args.length > 2) {
      let strikeId = parseInt(args[1]);
      let comment = args.slice(2).join(' ');
      return Strikes.comment.call(this, strikeId, comment, {message});
    }
    return;
  }
  
  if (args[0] === '!warn') {
    if (isModerator && args.length > 2) {
      let user = await this.users.fetch(args[1].replace(/[^0-9]/g, ''));
      let comment = args.slice(2).join(' ');
      return Warns.add.call(this, user, message.author, comment);
    }
    return;
  }
  
  if (args[0] === '!warns') {
    let user;
    let mod = isModerator ? message.author : undefined;
    if (isModerator && args.length > 1)
      user = (await this.users.fetch(args[1].replace(/[^0-9]/g, ''))) ?? message.author;
    else
      user = message.author;
    return Warns.list.call(this, user, mod, {message});
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
    this.master.logDebug(`BH Shooters:`, moderatorIds);
    let moderatorId = moderatorIds[Math.floor(Math.random()*moderatorIds.length)];
    let moderator = await this.users.fetch(moderatorId);
    
    let prefixes = ["GIGA", "Weak", "Cum", "Burning", "Stinky", "Auto-aim", "Tracking", "Weeb", "Penetrating", "Thrusting", "Slimy", "Invisible", "Holy", "Daunting", "Demonic", "Bald", "Rimjob", "Femboy turning", "Catgirl turning", "Ass gaping", "Mediocre", "Explosive", "Extra large", "Cheating", "Ultra Mastermode Hardcore", "Shitting", "Chugging", "Rotting", "Pissing", "Twerking", "Sussy", "REALLY MAD", "Gachi"];
    let prefix = prefixes[Math.floor(Math.random()*prefixes.length)];
    
    let suffixes = ["OFHELL", "of Cum", "of Thrusting", "of Poop", "of Slime", "of Pride", "of Rimjob", "of Goatsie", "of Balding", "up their ass", "of the Pit", "of Fire and Destruction", "of the Abyss", "of the Unending Suffering", "of the Deceased Souls", "of Happiness", "of Infinite Darkness", "of Mediocrity", "of the Two Wives", "of the Fuck", "of Choking", "of Shitting", "of the Locker Room", "of Cringe", "of the Green Frog", "of the Shiny Orb", "of the Microwaved Coffee", "of the Chug Boot"];
    let suffix = suffixes[Math.floor(Math.random()*suffixes.length)];
    
    let duration = 3600000 * 12;
    let roll = Math.random();
    if(roll < 0.01)
      duration = 3600000 * 48;
    else if(roll < 0.06)
      duration = 3600000 * 36;
    else if(roll < 0.21)
      duration = 3600000 * 24;
    else if(roll < 0.51)
      duration = 3600000 * 16;
    
    await this.master.modules.pitbot.database.run('INSERT INTO bullethell (userId, duration, date) VALUES (?, ?, ?)', message.author.id, duration, Date.now());
    await message.reply(await Messages.bulletHell.call(this, message, moderator, {prefix, suffix, duration}));
    await updateRole.call(this, message.author.id);
  }
}
