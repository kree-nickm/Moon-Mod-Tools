/**
 * Event handlers for Discord.js events that pitbot listens for.
 * @module modules/pitbot/events
 */
import { updateRole, getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';
import * as Strikes from './strikeManager.mjs';
import * as Warns from './warnManager.mjs';
import * as Pits from './pitManager.mjs';

export async function guildMemberAdd(member) {
  await updateRole.call(this, member.id, 'guildMemberAdd');
}

export async function guildAuditLogEntryCreate(entry, guild) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  if (entry.action === 25 && entry.target && entry.executor && !entry.executor.bot) {
    let role = await guild.roles.fetch(module.options.pitRoleId);
    if (entry.changes?.[0]?.key === '$add') {
      if (entry.changes[0].new.find(cng => cng.id === role.id)) {
        // Implicit strike? But what severity?
        this.master.logWarn(`Moderator ${entry.executor.username} (${entry.executor.id}) added pit role to ${entry.target.username} (${entry.target.id}) manually, which is not yet supported.`);
      }
    }
    else if (entry.changes?.[0]?.key === '$remove') {
      if (entry.changes[0].new.find(cng => cng.id === role.id)) {
        // Implicit release.
        this.master.logDebug(`Moderator ${entry.executor.username} (${entry.executor.id}) removed pit role from ${entry.target.username} (${entry.target.id}) manually; implicitly calling /release for them.`);
        await Strikes.release.call(this, entry.target, entry.executor);
        if (true) // No message sent yet.
          await logChannel.send(await Messages.pitNotice.call(this, entry.target, false, `Pit role removed by <@${entry.executorId}>`));
      }
    }
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
  
  if (!message.content?.startsWith('!'))
    return;
  
  let args = message.content.split(/\s+/g);
  if (args[0] === '!bh')
    return await handleBulletHell.call(this, message);
  
  let isModerator = (await getModeratorIds.call(this, true)).includes(message.author.id);
  
  if (args[0] === '!timeout') {
    if (isModerator) {
      if (args.length > 2) {
        let user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
        let severity = parseInt(args[2]);
        let comment = args.slice(3).join(' ');
        
        if (!user)
          await message.react('👻');
        else if (isNaN(severity) || severity < 1 || severity > 5)
          await message.react('🔢');
        else if (!comment)
          await message.react('🗨');
        else
          await Strikes.add.call(this, user, message.author, severity, comment);
      }
    }
    return;
  }
  
  if (args[0] === '!release') {
    if (isModerator && args.length > 1) {
      let user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
      let amend = args.length > 2 && args[2] == 'amend';
      
      if (!user)
        await message.react('👻');
      else
        await Strikes.release.call(this, user, message.author, amend, {message});
    }
    return;
  }
  
  if (args[0] === '!strikes') {
    let user;
    let mod = isModerator ? message.author : undefined;
    if (isModerator && args.length > 1)
      user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
    else
      user = message.author;
    
    if (!user)
      await message.react('👻');
    else
      await Strikes.list.call(this, user, mod, {message});
    return;
  }
  
  if (args[0] === '!removestrike') {
    if (isModerator && args.length > 1) {
      let strikeId = parseInt(args[1]);
      
      if (isNaN(strikeId))
        await message.react('#');
      else
        await Strikes.remove.call(this, strikeId, {message});
    }
    return;
  }
  
  if (args[0] === '!editcomment') {
    if (isModerator && args.length > 1) {
      let strikeId = parseInt(args[1]);
      let comment = args.slice(2).join(' ');
      
      if (isNaN(strikeId))
        await message.react('#');
      else if (!comment)
        await message.react('🗨');
      else
        await Strikes.comment.call(this, strikeId, comment, {message});
    }
    return;
  }
  
  if (args[0] === '!editseverity') {
    if (isModerator && args.length > 1) {
      let strikeId = parseInt(args[1]);
      let severity = parseInt(args[2]);
      
      if (isNaN(strikeId))
        await message.react('#');
      else if (isNaN(severity) || severity < 1 || severity > 5)
        await message.react('🔢');
      else
        await Strikes.severity.call(this, strikeId, severity, {message});
    }
    return;
  }
  
  if (args[0] === '!warn') {
    if (isModerator && args.length > 2) {
      let user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
      let comment = args.slice(2).join(' ');
      await Warns.add.call(this, user, message.author, comment);
    }
    return;
  }
  
  if (args[0] === '!warns') {
    let user;
    let mod = isModerator ? message.author : undefined;
    if (isModerator && args.length > 1)
      user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
    else
      user = message.author;
    
    if (!user)
      await message.react('👻');
    else
      await Warns.list.call(this, user, mod, {message});
    return;
  }
  
  if (args[0] === '!selfpit') {
    let hours = 0;
    if (args.length > 1) {
      if (args[1].slice(-1) === 'h')
        hours = parseInt(args[1].slice(0, -1));
    }
    else
      hours = 24;
    
    if (!hours || hours > 72)
      await message.react('🕗');
    else
      await Pits.pit.call(this, message.author, hours*(this.master.config.id === '1040775664539807804' ? 1000 : 3600000));
    return;
  }
  
  if (args[0] === '!timeoutns') {
    if (isModerator) {
      if (args.length > 2) {
        let user = await this.users.fetch(args[1].replace(/[^0-9]/g, '')).catch(err => null);
        let hours = 0;
        let comment = args.slice(3).join(' ');
        
        if (args[2].slice(-1) === 'h')
          hours = parseInt(args[2].slice(0, -1));
        
        if (!user)
          await message.react('👻');
        else if (!hours)
          await message.react('🕗');
        else if (!comment)
          await message.react('🗨');
        else
          await Pits.pit.call(this, user, hours*(this.master.config.id === '1040775664539807804' ? 1000 : 3600000), message.author, comment);
      }
    }
    return;
  }
}

/**
 * Handles the 'bullet hell' feature of the bot.
 * @this discord.js/Client
 * @param {discord.js/Message} message - The `!bh` message the user typed.
 */
async function handleBulletHell(message) {
  let module = this.master.modules.pitbot;
  let bhCD = this.master.config.id === '1040775664539807804' ? 30000 : 86400000;
  let bullethell = await module.database.get('SELECT * FROM bullethell WHERE userId=? ORDER BY date DESC LIMIT 1', message.author.id);
  if (bullethell && Date.now() - bullethell.date < bhCD) {
    await message.react('⏲');
    return;
  }
  
  if (Math.random() >= 0.5) {
    await message.reply(await Messages.bulletHell.call(this, message));
    await this.master.modules.pitbot.database.run('INSERT INTO bullethell (userId, duration, date, messageLink) VALUES (?, ?, ?, ?)', message.author.id, 0, Date.now(), message.url);
  }
  else {
    let moderatorIds = await getModeratorIds.call(this);
    //this.master.logDebug(`BH Shooters:`, moderatorIds);
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
    
    if (this.master.config.id === '1040775664539807804')
      duration = duration / 3600;
    
    await message.reply(await Messages.bulletHell.call(this, message, moderator, {prefix, suffix, duration}));
    
    await new Promise((resolve, reject) => setTimeout(() => resolve(), 5000));
    
    await this.master.modules.pitbot.database.run('INSERT INTO bullethell (userId, duration, date, messageLink) VALUES (?, ?, ?, ?)', message.author.id, duration, Date.now(), message.url);
    let roleData = await updateRole.call(this, message.author.id, 'handleBulletHell');
    await message.author.send(await Messages.bulletHellNotification.call(this, roleData.bullethell));
  }
}
