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
    if (this.master.modules.modmail.options.newTagId)
      await myThread.setAppliedTags([this.master.modules.modmail.options.newTagId]);
    await this.master.modules.modmail.database.run('INSERT INTO tickets (userId, threadId, number) VALUES (?, ?, ?)', member.user.id, myThread.id, number);
    await (await myThread.fetchStarterMessage()).react('✅');
  }
  return myThread;
}

/**
 * Handle when a moderator closes a ticket thread via a chat command.
 * @this discord.js/Client
 * @param {discord.js/ThreadChannel} ticket - The ticket being closed.
 * @param {discord.js/User} moderator - The moderator who closed the ticket.
 * @param {string} [reason] - The reason given for closing the ticket.
 */
export async function closeThread(ticket, moderator, reason) {
  this.master.logDebug(`Closing/locking ticket '${ticket.name}'.`, {moderator:`${moderator.username} (${moderator.id})`, reason});
  if (!ticket.archived && this.master.modules.modmail.options.resolvedTagId)
    await ticket.setAppliedTags([this.master.modules.modmail.options.resolvedTagId], reason);
  await ticket.setLocked(true, reason);
  await ticket.setArchived(true, reason);
}

/**
 * Determine who created a ticket.
 * @this discord.js/Client
 * @param {discord.js/ThreadChannel} ticket - The ticket in question.
 * @returns {discord.js/User} The user who created the ticket, or null if it could not be determined.
 */
export async function getTicketCreator(ticket) {
  let module = this.master.modules.modmail;
  let starterMessage = await ticket.fetchStarterMessage();
  
  // Ticket already in database.
  let userId = (await module.database.get('SELECT userId FROM tickets WHERE threadId=?', ticket.id))?.userId;
  let user = userId ? await this.users.fetch(userId) : null;
  if (user) {
    this.master.logDebug(`Found ticket '${ticket.name}' in database.`);
    return user;
  }
  
  // Ticket posted by this bot.
  userId = starterMessage.embeds[0].fields.find(fld => fld.name === 'Id')?.value;
  user = userId ? await this.users.fetch(userId) : null;
  if (user)
    return user;
  
  // Ticket posted by previous bot.
  let userString = starterMessage.embeds[0].fields.find(fld => fld.name === 'User')?.value;
  let start = userString.lastIndexOf('(');
  if(start > -1) {
    start += 1;
    let end = userString.lastIndexOf(')');
    userId = userString.slice(start, end-start);
    user = userId ? await this.users.fetch(userId) : null;
    if (user)
      return user;
  }
  
  return null;
}
