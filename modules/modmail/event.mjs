/**
 * Handler for messages being sent.
 * @module modules/modmail/event
 */
import { getOrCreateThread, closeThread, getTicketCreator } from './ticket.mjs';
import * as Messages from './messageTemplates.mjs';

/**
 * Creates or updates a ticket with a user's message. For moderator messages, see {@link module:modules/modmail/event#modMailMessage}.
 * @this discord.js/Client
 * @param {discord.js/Message} message - Any message the bot sees.
 */
export async function messageCreate(message) {
  if (message.partial)
    message = await message.fetch();
  
  if (message.author.bot)
    return;
  
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (message.channel.parentId === mailChannel.id) {
    await modMailMessage.call(this, message);
  }
  else if (!message.inGuild()) {
    // Verify that the user is a member of the guild we are handling mod mail for.
    let member = await mailChannel.guild.members.fetch(message.author);
    if (!member)
      return;
    
    // Find the user's active thread, or create a new one.
    let ticket = await getOrCreateThread.call(this, mailChannel, member);
    //this.master.logDebug(`Thread msg count:`, ticket.messageCount);
    
    // Add the user's message to the thread.
    let created = !ticket.messageCount;
    await ticket.send(await Messages.messageReceived.call(this, {message, ticket}));
    await message.react('✅');
    await message.author.send(await Messages.ticketConfirmation.call(this, {
      message,
      ephemeral: false,
      ticket,
      created,
    }));
    //this.master.logDebug(`Thread msg count:`, ticket.messageCount);
  }
}

/**
 * Handle when a mod sends a message in a modmail thread.
 * @this discord.js/Client
 * @param {discord.js/Message} message - A message sent by a mod in a modmail thread.
 */
async function modMailMessage(message) {
  // Define these to make the code easier to read.
  let module = this.master.modules.modmail;
  let ticket = message.channel;
  
  // Note: This might be pointless, because threads are supposed to reopen instantly if a message is sent to them by someone with the ability to type in closed threads.
  if (ticket.archived) {
    this.master.logDebug(`Thread is archived; no need to do anything with it.`);
    return;
  }
  
  let user = await getTicketCreator.call(this, ticket);
  if (!user) {
    this.master.logError(`Unable to determine which user created this ticket.`, {message});
    await message.react('❗');
    return;
  }
  
  if (message.content.startsWith('=')) {
    if (message.content === '=close' || message.content.startsWith('=close ') || message.content === '= close' || message.content.startsWith('= close ')) {
      let reason = message.content.length > 7 ? message.content.slice(7) : '';
      await closeThread.call(this, ticket, message.author, reason);
      await user.send(await Messages.closeConfirmation.call(this, ticket, message.author, reason));
    }
    else if (message.content === '=lock' || message.content.startsWith('=lock ') || message.content === '= lock' || message.content.startsWith('= lock ')) {
      let reason = message.content.length > 7 ? message.content.slice(7) : '';
      await ticket.setLocked(true, reason);
      if (module.options.lockedTagId)
        await ticket.setAppliedTags([module.options.lockedTagId], reason);
    }
    else if (message.content === '=unlock' || message.content.startsWith('=unlock ') || message.content === '= unlock' || message.content.startsWith('= unlock ')) {
      let reason = message.content.length > 7 ? message.content.slice(7) : '';
      await ticket.setLocked(false, reason);
      await ticket.setAppliedTags(ticket.appliedTags.filter(tagId => tagId != module.options.lockedTagId), reason);
    }
    return;
  }
  
  if (ticket.locked || ticket.appliedTags.includes(module.options.lockedTagId)) {
    this.master.logDebug(`Thread is locked; no need to message user.`);
    return;
  }
  
  await user.send(await Messages.newResponse.call(this, message));
  await message.react('✅');
}
