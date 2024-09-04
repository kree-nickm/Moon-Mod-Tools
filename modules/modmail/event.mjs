/**
 * Handler for messages being sent.
 * @module modules/modmail/event
 */
import { getOrCreateThread, closeThread } from './ticket.mjs';
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
    this.master.logDebug(`Thread msg count:`, ticket.messageCount);
    
    // Add the user's message to the thread.
    await message.author.send(await Messages.ticketConfirmation.call(this, {
      message,
      ephemeral: false,
      ticket,
      created: !ticket.messageCount,
    }));
    await ticket.send(await Messages.messageReceived.call(this, {message, ticket}));
    this.master.logDebug(`Thread msg count:`, ticket.messageCount);
  }
}

/**
 * Handle when a mod sends a message in a modmail thread.
 * @this discord.js/Client
 * @param {discord.js/Message} message - A message sent by a mod in a modmail thread.
 */
async function modMailMessage(message) {
  if (message.channel.locked || message.channel.archived || message.channel.appliedTags.includes(this.master.modules.modmail.options.lockTagId)) {
    this.master.logDebug(`Thread is locked; no need to message user.`);
    return;
  }
  
  let threadMsg = await message.channel.fetchStarterMessage();
  let userId = threadMsg.embeds[0].fields.find(fld => fld.name === 'Id')?.value;
  let user = await this.users.fetch(userId);
  if (!user) {
    this.master.logError(`Unable to determine which user created this ticket.`, {message, threadMsg, userId});
    return;
  }
  
  if (message.content.startsWith('=')) {
    if (message.content === '=close' || message.content.startsWith('=close ')) {
      let reason = message.content.length > 7 ? message.content.slice(7) : '';
      await closeThread.call(this, message.channel, message.author, reason);
      await user.send(await Messages.closeConfirmation.call(this, message.channel, message.author, reason));
    }
    return;
  }
  
  await user.send(await Messages.newResponse.call(this, message));
}
