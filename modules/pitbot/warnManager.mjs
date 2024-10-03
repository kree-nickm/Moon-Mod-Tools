/**
 * Functions for managing a user's strikes.
 * @module modules/pitbot/strikes
 */
import { getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function add(user, mod, comment) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  
  await module.database.run('INSERT INTO warnings (userId, modId, comment, date) VALUES (?, ?, ?, ?)', user.id, mod.id, comment, Date.now());
  let warnings = await module.database.all('SELECT rowId AS warnId,* FROM warnings WHERE userId=?', user.id);
  
  let notifSent = false;
  try {
    await user.send(await Messages.warnNotification.call(this, logChannel.guild, comment, warnings));
    notifSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await logChannel.send(await Messages.warnConfirmation.call(this, user, mod, comment, warnings, notifSent));
}

export async function list(user, mod, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  
  let warnings = await module.database.all('SELECT rowId AS warnId,* FROM warnings WHERE userId=?', user.id);
  
  if (interaction)
    await interaction.reply(await Messages.listWarnings.call(this, logChannel.guild, user, warnings, {mod, ephemeral: interaction.channel.id !== logChannel.id}));
  else if (message) {
    if (message.channel.id === logChannel.id)
      await message.reply(await Messages.listWarnings.call(this, logChannel.guild, user, warnings, {mod}));
    else {
      try {
        await user.send(await Messages.listWarnings.call(this, logChannel.guild, user, warnings, {mod}));
      }
      catch(err) {
        this.master.logDebug(`Failed to DM user ${user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
        await message.react('🔇');
      }
    }
  }
}
