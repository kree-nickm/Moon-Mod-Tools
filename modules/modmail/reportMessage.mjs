/**
 * Message context menu command to report a message.
 * @module modules/modmail/reportMessage
 */
import { getOrCreateThread } from './ticket.mjs';
import * as Messages from './messageTemplates.mjs';

/**
 * Creates or updates a ticket with the reported message.
 */
export async function handler(interaction) {
  // Verify that the user is a member of the guild we are handling mod mail for.
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (!interaction.member || interaction.member.guild.id !== mailChannel.guild.id) {
    return;
  }
  
  // Verify that the bot can see the message being interacted with.
  try {
    await interaction.targetMessage.fetch();
  }
  catch(error) {
    this.master.logInfo(`User tried to report a message in a channel that the bot can't see.`);
    await interaction.reply(await Messages.reportFailed.call(this, {interaction,error}));
    return;
  }
  
  // This sometimes takes a while, so let's defer it.
  await interaction.deferReply({ephemeral:true});
  
  // Find the user's active thread, or create a new one.
  let ticket = await getOrCreateThread.call(this, mailChannel, interaction.member);
  
  let created = !ticket.messageCount;
  
  // Only send DM for ticket creation.
  let confirmSent;
  if (created) {
    try {
      await interaction.user.send(await Messages.ticketConfirmation.call(this, {
        interaction,
        ephemeral: false,
        ticket,
        created,
      }));
      confirmSent = true;
    }
    catch(err) {
      this.master.logDebug(`Failed to DM user ${interaction.user.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
      confirmSent = false;
    }
  }
  
  // Add the user's message to the thread.
  await ticket.send(await Messages.messageReceived.call(this, {interaction, ticket, confirmSent}));
  //this.master.logDebug(interaction.targetMessage);
  await interaction.followUp(await Messages.ticketConfirmation.call(this, {interaction, ticket, created, confirmSent}));
}

export const definition = {
  name: 'modmail',
  type: 3,
};
