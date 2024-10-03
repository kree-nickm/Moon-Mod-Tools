/**
 * @module modules/modmail/command
 */
import * as Messages from './messageTemplates.mjs';
import { getOrCreateThread } from './ticket.mjs';

export async function handler(interaction) {
  // Verify that the user is a member of the guild we are handling mod mail for.
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (!interaction.member || interaction.member.guild.id !== mailChannel.guild.id) {
    return;
  }
  
  // This sometimes takes a while, so let's defer it.
  await interaction.deferReply({ephemeral:true});
  
  // Find the user's active thread, or create a new one.
  let ticket = await getOrCreateThread.call(this, mailChannel, interaction.member);
  
  // Add the user's message to the thread.
  let content = interaction.options.getString('description');
  let message = {
    content,
    author: interaction.member.user,
    attachments: [],
  };
  let created = !ticket.messageCount;
    
  // Attempt to send a DM to the user and let mods know if it failed.
  let confirmSent = false;
  try {
    await message.author.send(await Messages.ticketConfirmation.call(this, {
      message,
      ephemeral: false,
      ticket,
      created,
    }));
    confirmSent = true;
  }
  catch(err) {
    this.master.logDebug(`Failed to DM user ${message.author.username}: (class:${err.constructor.name}) (code:${err.code}) (name:${err.name}) (status:${err.status}) (url:${err.url}) Message: ${err.message}`);
  }
  await ticket.send(await Messages.messageReceived.call(this, {message, ticket, confirmSent}));
  await interaction.followUp(await Messages.ticketConfirmation.call(this, {interaction, ticket, created, confirmSent}));
}

export const definition = {
  "name": "modmail",
  "description": "Create a new ticket to contact staff.",
  "options": [
    {
      "name": "description",
      "description": "Description of the ticket.",
      "type": 3,
      "required": true,
    },
  ],
};
