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
  
  await logChannel.send(await Messages.warnConfirmation.call(this, user, mod, comment, warnings));
  await user.send(await Messages.warnNotification.call(this, logChannel.guild, comment, warnings));
}

export async function list(user, fromMod, {message, interaction}={}) {
  let module = this.master.modules.pitbot;
  let logChannel = await this.channels.fetch(module.options.logChannelId);
  let replyTo = interaction ?? message;
  
  let warnings = await module.database.all('SELECT rowId AS warnId,* FROM warnings WHERE userId=?', user.id);
  
  await replyTo.reply(await Messages.listWarnings.call(this, logChannel.guild, user, warnings, {fromMod, ephemeral: replyTo.channel.id !== logChannel.id}));
}
