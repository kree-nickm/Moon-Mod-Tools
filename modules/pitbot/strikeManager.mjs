/**
 * Functions for managing a user's strikes.
 * @module modules/pitbot/strikeManager
 */
import { updateRole, getStrikes, getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function add(user, mod, severity, comment) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  
  await module.database.run('INSERT INTO strikes (userId, modId, comment, severity, date) VALUES (?, ?, ?, ?, ?)', user.id, mod.id, comment, severity, Date.now());
  let pitData = await updateRole.call(this, user.id, 'add');
  
  let notifSent = false;
  try {
    await user.send(await Messages.strikeNotification.call(this, logChannel.guild, severity, comment, pitData.strikes));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.strikeConfirmation.call(this, user, mod, severity, comment, pitData.strikes, notifSent));
  
  if (pitData.strikes.active.length >= 5) {
    await logChannel.send(await Messages.maximumStrikes.call(this, user));
  }
}

export async function release(user, mod, amend, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let pitData = await updateRole.call(this, user.id, 'list');
  if (pitData.strikes.releaseTime < Date.now() && (pitData.bullethell?.releaseTime??0) < Date.now()) {
    let replyTo = interaction ?? message;
    if (replyTo)
      await replyTo.reply({content:`${user} is not in the pit.`,ephemeral:true});
    return;
  }
  
  if (amend) {
    let strikes = await getStrikes.call(this, user.id);
    if (strikes.active.length)
      await module.database.run('UPDATE strikes SET severity=0 WHERE rowId=?', strikes.active[0].strikeId);
  }
  else
    await module.database.run('INSERT INTO strikes (userId, modId, severity, date) VALUES (?, ?, ?, ?)', user.id, mod.id, -1, Date.now());
  pitData = await updateRole.call(this, user.id, 'release');
  
  let notifSent = false;
  try {
    await user.send(await Messages.releaseNotification.call(this, logChannel.guild, amend, pitData.strikes));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.releaseConfirmation.call(this, user, mod, amend, pitData.strikes, notifSent));
}

export async function remove(strikeId, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
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
  let pitData = await updateRole.call(this, user.id, 'remove');
  
  let notifSent = false;
  try {
    await user.send(await Messages.removeNotification.call(this, logChannel.guild, strike, pitData.strikes));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.removeConfirmation.call(this, user, mod, strike, pitData.strikes, notifSent));
}

export async function list(user, mod, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  
  let strikeReport = await getStrikes.call(this, user.id);
  
  if (interaction)
    await interaction.reply(await Messages.listStrikes.call(this, logChannel.guild, user, strikeReport, {mod, ephemeral: interaction.channel.id !== logChannel.id}));
  else if (message) {
    if (message.channel.id === logChannel.id)
      await message.reply(await Messages.listStrikes.call(this, logChannel.guild, user, strikeReport, {mod}));
    else {
      try {
        await user.send(await Messages.listStrikes.call(this, logChannel.guild, user, strikeReport, {mod}));
      }
      catch(err) {
        this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
        await message.react('🔇');
      }
    }
  }
}

export async function comment(strikeId, comment, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
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
