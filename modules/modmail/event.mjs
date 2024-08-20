import { getOrCreateThread, closeThread } from './ticket.mjs';
import * as Messages from './messageTemplates.mjs';

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
    let myThread = await getOrCreateThread.call(this, mailChannel, member);
    
    // Add the user's message to the thread.
    await myThread.send(await Messages.messageReceived.call(this, {message}));
  }
}

/**
 * Handle when a mod sends a message in a modmail thread.
 * @this Client
 * @param {Message} message - A message sent by a mod in a modmail thread.
 */
async function modMailMessage(message) {
  if (message.channel.locked || message.channel.archived) {
    this.master.logDebug(`Thread is locked; no need to message user.`);
    return;
  }
  
  if (message.content.startsWith('=')) {
    this.master.logDebug(`Command character used; no need to message user.`);
    if (message.content === '=close' || message.content.startsWith('=close '))
      await closeThread.call(this, message);
    return;
  }
  
  let threadMsg = await message.channel.fetchStarterMessage();
  let userId = threadMsg.embeds[0].fields.find(fld => fld.name === 'Id')?.value;
  let user = await this.users.fetch(userId);
  if (!user) {
    this.master.logError(`Unable to determine which user to send the response to.`, {message, threadMsg, userId});
    return;
  }
  
  await user.send(await Messages.newResponse.call(this, message));
}
