/**
 * Functions that manage a ticket.
 * @module modules/modmail/ticket
 */
import * as Messages from './messageTemplates.mjs';

/**
 * Get the open ticket thread of a guild member, or create a new one if there is none.
 * @this discord.js/Client
 * @param {discord.js/ThreadOnlyChannel} mailChannel - The modmail channel that contains all ticket threads.
 * @param {discord.js/GuildMember} member - The creator of the ticket.
 * @returns {discord.js/ThreadChannel} The open ticket thread for the given guild member.
 */
export async function getOrCreateThread(mailChannel, member) {
  let activeThreads = await mailChannel.threads.fetchActive();
  let myThread = activeThreads.threads.find(thread => !thread.locked && thread.name.startsWith(`${member.user.username} - `));
  if (!myThread) {
    // Count this user's threads so we can append the number to the name.
    let myThreads = await this.master.modules.modmail.database.all('SELECT * FROM tickets WHERE userId=?', member.user.id);
    let { highest } = await this.master.modules.modmail.database.get('SELECT MAX(number) as highest FROM tickets WHERE userId=?', member.user.id);
    let number = Math.max(myThreads.length, highest||0)+1;
    
    myThread = await mailChannel.threads.create({
      name: `${member.user.username} - ${number}`,
      message: await Messages.newTicket.call(this, member),
    });
    await this.master.modules.modmail.database.run('INSERT INTO tickets (userId, threadId, number) VALUES (?, ?, ?)', member.user.id, myThread.id, number);
  }
  return myThread;
}

/**
 * Handle when a moderator closes a ticket thread via a chat command.
 * @this discord.js/Client
 * @param {discord.js/Message} message - The moderator's message, whose content begins with `=close`
 */
export async function closeThread(message) {
  let reason = message.content.length > 7 ? message.content.slice(7) : '';
  this.master.logDebug(`Closing/locking ticket '${message.channel.name}', reason:`, reason);
  await message.channel.setLocked(true, reason);
  await message.channel.setArchived(true, reason);
}
