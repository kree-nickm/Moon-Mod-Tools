/**
 * Functions for managing a user's strikes.
 * @module modules/pitbot/strikes
 */
import { updateRole, getStrikes, getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function add(user, mod, severity, comment, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  await this.master.modules.pitbot.database.run('INSERT INTO strikes (userId, modId, comment, severity, date) VALUES (?, ?, ?, ?, ?)', user.id, mod.id, comment, severity, Date.now());
  let pitData = await updateRole.call(this, user.id);
  if(replyTo && typeof(replyTo.reply) === 'function')
    replyTo.reply(await Messages.strikeConfirmation.call(this, user, mod, severity, comment, pitData.strikes.releaseDate));
  user.send(await Messages.strikeNotification.call(this, severity, comment, pitData.strikes.releaseDate));
}

export async function release(user, mod, amend, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  if (amend) {
    let strikes = await getStrikes.call(this, user.id);
    if (strikes.active) {
      await remove.call(this, strikes.active.rowId, replyTo);
    }
    //else
    //  replyTo.reply(await Messages.releaseFailed.call(this));
  }
  else
    await this.master.modules.pitbot.database.run('INSERT INTO strikes (userId, modId, severity, date) VALUES (?, ?, ?, ?, ?)', user.id, mod.id, -1, Date.now());
  let pitData = await updateRole.call(this, user.id);
  //if(replyTo && typeof(replyTo.reply) === 'function')
  //  replyTo.reply(await Messages.releaseConfirmation.call(this));
  //user.send(await Messages.releaseNotification.call(this));
}

export async function list(user, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  let strikes = await getStrikes.call(this, user.id);
  //if(replyTo && typeof(replyTo.reply) === 'function')
  //  replyTo.reply(await Messages.strikes.call(this, strikes));
}

export async function remove(strikeId, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  let strike = await this.master.modules.pitbot.database.get('SELECT rowId AS strikeId,* FROM strikes WHERE rowId=?', strikeId);
  if (!strike || strike.severity <= 0) {
    await replyTo.reply(await Messages.removeFailed.call(this));
    return;
  }
  
  await this.master.modules.pitbot.database.run('UPDATE strikes SET severity=0 WHERE rowId=?', strikeId);
  
  let pitData = await updateRole.call(this, user.id);
  //if(replyTo && typeof(replyTo.reply) === 'function')
  //  replyTo.reply(await Messages.removeConfirmation.call(this));
  //user.send(await Messages.removeNotification.call(this));
}

export async function comment(strikeId, comment, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  await this.master.modules.pitbot.database.run('UPDATE strikes SET comment=? WHERE rowId=?', comment, strikeId);
  //if(replyTo && typeof(replyTo.reply) === 'function')
  //  replyTo.reply(await Messages.commentConfirmation.call(this));
}

/*
Whenever moderation action is taken against a user, that user is notified by the bot including the duration of their timeout, the comment provided, their active strikes, but not the issuer.
*/
