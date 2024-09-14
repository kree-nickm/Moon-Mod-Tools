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
  
  // Find the user's active thread, or create a new one.
  let ticket = await getOrCreateThread.call(this, mailChannel, interaction.member);
  //this.master.logDebug(`Thread msg count:`, ticket.messageCount);
  
  // Add the user's message to the thread.
  let created = !ticket.messageCount;
  await ticket.send(await Messages.messageReceived.call(this, {interaction, ticket}));
  await interaction.reply(await Messages.ticketConfirmation.call(this, {
    interaction,
    ephemeral: true,
    ticket,
    created,
  }));
  // Only send DM for ticket creation.
  if (created) {
    await interaction.user.send(await Messages.ticketConfirmation.call(this, {
      interaction,
      ephemeral: false,
      ticket,
      created,
    }));
  }
  //this.master.logDebug(`Thread msg count:`, ticket.messageCount);
}

export const definition = {
  name: 'modmail',
  type: 3,
};
