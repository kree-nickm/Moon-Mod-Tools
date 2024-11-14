/**
 * Functions for managing a user's strikes.
 * @module modules/pitbot/strikeManager
 */
import PitReport from './PitReport.mjs';
import { updateRole } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function add(user, mod, severity, comment='*No reason given.*') {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (!user)
    throw new Error(`Invalid user.`);
  
  if (!mod)
    throw new Error(`Invalid moderator.`);
  
  if (isNaN(severity) || severity < 1 || severity > 5)
    throw new Error(`Invalid severity. Must be a number from 1 to 5.`);
  
  // Do the add.
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  await module.database.run('INSERT INTO strikes (userId, modId, comment, severity, date) VALUES (?, ?, ?, ?, ?)', user.id, mod.id, comment, severity, Date.now());
  let report = await updateRole.call(this, user.id, 'add');
  
  let notifSent = false;
  try {
    await user.send(await Messages.strikeNotification.call(this, logChannel.guild, severity, comment, report));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.strikeConfirmation.call(this, user, mod, severity, comment, report, notifSent));
  
  if (report.activeStrikes.length >= 5) {
    await logChannel.send(await Messages.maximumStrikes.call(this, user));
  }
}

export async function release(user, mod, amend=false, {message, interaction, source}={}) {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (!user)
    throw new Error(`Invalid user.`);
  
  if (!mod)
    throw new Error(`Invalid moderator.`);
  
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let report = await PitReport.create(user.id, {module});
  let lastPit = report.getCurrentPit();
  if (!lastPit?.pitted) {
    await updateRole.call(this, user.id, 'release');
    let replyTo = interaction ?? message;
    if (replyTo)
      await replyTo.reply({content:`${user} should already not be in the pit.`,ephemeral:true});
    return;
  }
  
  if (amend) {
    if (report.getStrikeRelease() > Date.now())
      await module.database.run('UPDATE strikes SET severity=0 WHERE rowId=?', report.activeStrikes[0].strikeId);
    else
      amend = false;
  }
  else
    await module.database.run('INSERT INTO strikes (userId, modId, severity, date) VALUES (?, ?, ?, ?)', user.id, mod.id, -1, Date.now());
  report = await updateRole.call(this, user.id, 'release');
  
  let notifSent = false;
  try {
    await user.send(await Messages.releaseNotification.call(this, logChannel.guild, amend, report));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.releaseConfirmation.call(this, {user, mod, amend, report, notifSent, source}));
}

export async function remove(strikeId, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (isNaN(strikeId))
    throw new Error(`Invalid strikeId. Must be a number.`);
  
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let replyTo = interaction ?? message;
  let mod = interaction?.user ?? message?.author;
  
  let strike = await module.database.get('SELECT rowId AS strikeId,* FROM strikes WHERE rowId=?', strikeId);
  if (replyTo && !strike || strike.severity <= 0) {
    await replyTo.reply(await Messages.removeFailed.call(this, strikeId, strike));
    return;
  }
  
  await module.database.run('UPDATE strikes SET severity=0 WHERE rowId=?', strikeId);
  let user = await this.users.fetch(strike.userId);
  let report = await updateRole.call(this, user.id, 'remove');
  
  let notifSent = false;
  try {
    await user.send(await Messages.removeNotification.call(this, logChannel.guild, strike, report));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.removeConfirmation.call(this, user, mod, strike, report, notifSent));
}

export async function list(user, mod, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (!user)
    throw new Error(`Invalid user.`);
  
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let report = await PitReport.create(user.id, {module});
  
  if (interaction)
    await interaction.reply(await Messages.listStrikes.call(this, logChannel.guild, user, report, {mod, ephemeral: interaction.channel.id !== logChannel.id}));
  else if (message) {
    if (message.channel.id === logChannel.id)
      await message.reply(await Messages.listStrikes.call(this, logChannel.guild, user, report, {mod}));
    else {
      try {
        await (mod??user).send(await Messages.listStrikes.call(this, logChannel.guild, user, report, {mod}));
      }
      catch(err) {
        this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
        await message.react('🔇');
      }
    }
  }
}

export async function comment(strikeId, comment='*No reason given.*', {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (isNaN(strikeId))
    throw new Error(`Invalid strikeId. Must be a number.`);
  
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let replyTo = interaction ?? message;
  let mod = interaction?.user ?? message?.author;
  
  let strike = await module.database.get('SELECT rowId AS strikeId,* FROM strikes WHERE rowId=?', strikeId);
  if (replyTo && !strike) {
    await replyTo.reply(await Messages.commentFailed.call(this, strikeId));
    return;
  }
  
  await module.database.run('UPDATE strikes SET comment=? WHERE rowId=?', comment, strikeId);
  
  await logChannel.send(await Messages.commentConfirmation.call(this, mod, strike, comment));
}

export async function severity(strikeId, severity, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  
  // Validate input.
  if (isNaN(strikeId))
    throw new Error(`Invalid strikeId. Must be a number.`);
  
  if (isNaN(severity) || severity < 1 || severity > 5)
    throw new Error(`Invalid severity. Must be a number from 1 to 5.`);
  
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let replyTo = interaction ?? message;
  let mod = interaction?.user ?? message?.author;
  
  let strike = await module.database.get('SELECT rowId AS strikeId,* FROM strikes WHERE rowId=?', strikeId);
  if (replyTo && !strike) {
    await replyTo.reply(await Messages.severityFailed.call(this, strikeId));
    return;
  }
  
  await module.database.run('UPDATE strikes SET severity=? WHERE rowId=?', severity, strikeId);
  
  await logChannel.send(await Messages.severityConfirmation.call(this, mod, strike, severity));
  let report = await updateRole.call(this, strike.userId, 'severity');
}
