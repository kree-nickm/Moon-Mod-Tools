/**
 * Functions for managing a user's strikes.
 * @module modules/pitbot/strikes
 */
import { getModeratorIds } from './roles.mjs';
import * as Messages from './messageTemplates.mjs';

export async function add(user, mod, comment, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(mod.id))
    return;
  
  await this.master.modules.pitbot.database.run('INSERT INTO warns (userId, modId, comment, date) VALUES (?, ?, ?, ?)', user.id, mod.id, comment, Date.now());
  if(replyTo && typeof(replyTo.reply) === 'function')
    replyTo.reply(await Messages.warnConfirmation.call(this, user, mod, comment));
  await user.send(await Messages.warnNotification.call(this, comment));
}

export async function list(user, replyTo) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(replyTo?.author?.id))
    return;
  
  let strikes = await getStrikes.call(this, user.id);
  //if(replyTo && typeof(replyTo.reply) === 'function')
  //  replyTo.reply(await Messages.strikes.call(this, strikes));
}
