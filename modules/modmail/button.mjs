/**
 * @module modules/modmail/button
 */
import * as Messages from './messageTemplates.mjs';
import { getOrCreateThread } from './ticket.mjs';

export const definition = {
  "name": "button",
  "description": "Post an interaction button that users can click to send a modmail.",
  "options": [
    {
      "name": "channel",
      "description": "The channel in which to post the button.",
      "type": 7,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};

export async function handler(interaction) {
  let channel = interaction.options.getChannel('channel');
  await channel.send(await Messages.modmailButton.call(this, button));
  await interaction.reply({ephemeral:true, content:`Message sent; check the appropriate channel.`});
}

export const button = {
  type: 2,
  label: 'Create Ticket',
  style: 2,
  emoji: {id: null, name: '📩'},
  custom_id: 'setup_modmail_button',
};

export async function setup_modmail_button(interaction) {
  await interaction.showModal(modal);
}

export const modal = {
  "title": "New Modmail",
  "custom_id": "modmail_popup",
  "components": [{
    "type": 1,
    "components": [{
      "type": 4,
      "custom_id": "modmail",
      "label": "Ticket Topic",
      "style": 2,
      "min_length": 1,
      "max_length": 2000,
      "placeholder": "Please state the issue you'd like to report",
      "required": true,
    }],
  }],
};

export async function post_modmail(interaction) {
  // Verify that the user is a member of the guild we are handling mod mail for.
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (!interaction.member || interaction.member.guild.id !== mailChannel.guild.id) {
    return;
  }
  
  // Find the user's active thread, or create a new one.
  let ticket = await getOrCreateThread.call(this, mailChannel, interaction.member);
  
  // Add the user's message to the thread.
  let content = interaction.fields.getTextInputValue('modmail');
  let message = {
    content,
    author: interaction.member.user,
    attachments: [],
  };
  let created = !ticket.messageCount;
  await ticket.send(await Messages.messageReceived.call(this, {message, ticket}));
  await message.author.send(await Messages.ticketConfirmation.call(this, {
    message,
    ephemeral: false,
    ticket,
    created,
  }));
  await interaction.reply(await Messages.ticketConfirmation.call(this, {
    interaction,
    ephemeral: true,
    ticket,
    created,
  }));
}
