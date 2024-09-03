/**
 * All of the templates for messages sent by the modmail module.
 * @module modules/modmail/messageTemplates
 */

/**
 * Convert an Attachment into an embed object.
 * @param {discord.js/Attachment} attachment - The Attachment object reported by Discord.js
 * @param {Object} overwrites - Properties to include in the embed object after it has been populated with Attachment data.
 * @returns {Object} An object to be included in the embeds array of a message's options before sending it.
 */
export async function attachmentToEmbed(attachment, overwrites={}) {
  let embed = {
    title: 'Attachment Details',
    fields: [
      {
        name: 'Name',
        value: attachment.name,
      },
      {
        name: 'Content Type',
        value: attachment.contentType,
      },
      {
        name: 'Size (Bytes)',
        value: attachment.size,
      },
    ],
  };
  
  if(attachment.width && attachment.height)
    embed.fields.push({
      name: 'Size (Pixels)',
      value: `${attachment.width}x${attachment.height}`,
    });
  
  if (attachment.contentType.startsWith('audio/'))
    embed.fields.push({
      name: 'Duration',
      value: `${attachment.duration}s`,
    });
  
  return Object.assign(embed, overwrites);
}

/**
 * Message sent to the ticket when a user creates or updates a ticket.
 * @this discord.js/Client
 * @param {discord.js/Object} input
 * @param {?discord.js/CommandInteraction} input.interaction - The interaction that was used to update the ticket, or undefined if no interaction was used.
 * @param {?discord.js/Message} input.message - The message that was sent to the bot to update the ticket, or undefined if no message was sent.
 * @param {discord.js/ThreadChannel} input.ticket - Reference to the ticket channel.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function messageReceived({interaction,message,ticket}={}) {
  let response = {
    embeds: [{
      title: `Message received`,
      color: 0x00ff00,
      footer: {
        text: `Mod Team - Ticket: ${ticket.name}`,
        icon_url: `${ticket.guild.iconURL()}`,
      },
    }],
  };
  
  if (interaction) {
    response.embeds[0].url = interaction.targetMessage.url;
    response.embeds[0].description = interaction.targetMessage.content;
    response.embeds[0].footer = {
      text: `${interaction.targetMessage.author.username}`,
      icon_url: `${interaction.targetMessage.author.avatarURL()}`,
    };
    response.files = [];
    for(let [attachmentId, attachment] of interaction.targetMessage.attachments) {
      response.files.push(attachment);
      response.embeds.push(await attachmentToEmbed.call(this, attachment));
    }
  }
  else if (message) {
    response.embeds[0].description = message.content;
    response.embeds[0].footer = {
      text: `${message.author.username}`,
      icon_url: `${message.author.avatarURL()}`,
    };
    response.files = [];
    for(let [attachmentId, attachment] of message.attachments) {
      response.files.push(attachment);
      response.embeds.push(await attachmentToEmbed.call(this, attachment));
    }
  }
  
  return response;
}

/**
 * Message sent to the user when they create or update a ticket.
 * @this discord.js/Client
 * @param {discord.js/Object} input
 * @param {?discord.js/CommandInteraction} input.interaction - The interaction that was used to update the ticket, or undefined if no interaction was used.
 * @param {?discord.js/Message} input.message - The message that was sent to the bot to update the ticket, or undefined if no message was sent.
 * @param {boolean} [input.created=false] - Whether this report has created a new ticket.
 * @param {discord.js/ThreadChannel} input.ticket - Reference to the ticket channel.
 * @param {boolean} [input.ephemeral=true] - Whether the message should be is ephemeral. DMs should not be ephemeral; other replies should be.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function ticketConfirmation({interaction,message,created=false,ticket,ephemeral=true}={}) {
  let response = {
    embeds: [{
      color: 0x00ff00,
      footer: {
        text: `Mod Team - Ticket: ${ticket.name}`,
        icon_url: `${ticket.guild.iconURL()}`,
      },
      fields: [],
    }],
    ephemeral,
  };
  
  if (created) {
    // Messaging for a newly created ticket.
    response.embeds[0].title = `Ticket Created`;
    response.embeds[0].description = `Your ticket has been created.`;
    if (ephemeral) {
      // When the message is sent in a channel. Should only be a response to an interaction.
      response.embeds[0].fields.push({
        name: 'Info',
        value: `A followup DM has been sent to you.\nPlease send any related attachments and further inquiries through that channel.\n\nIf you didn't receive any DMs please make sure you enable DMs from people in the same server or you will not be able to receive support from the mod team.`,
      });
      response.embeds[0].fields.push({
        name: 'Reported Message',
        value: `${interaction.targetMessage.url}`,
      });
    }
    else {
      // When the message is sent in a DM. Could either be in response to a DM or an interaction.
      response.embeds[0].fields.push({
        name: 'Info',
        value: `Anything you type in this DM will be conveyed to the Mod Team.\nOnce the Mod Team reviews your ticket they will put in contact with you through this same channel.`,
      });
      if (message) {
        response.embeds[0].fields.push({
          name: 'Message Sent',
          value: message.content,
        });
      }
      else if (interaction) {
        response.embeds[0].fields.push({
          name: 'Reported Message',
          value: `${interaction.targetMessage.url}`,
        });
      }
    }
  }
  else {
    // Messaging for a updating a ticket.
    if (ephemeral) {
      // When the message is sent in a channel. Should only be a response to an interaction.
      response.embeds[0].title = `Ticket Updated`;
      response.embeds[0].description = `Your ticket was updated.`;
      response.embeds[0].fields.push({
        name: 'Info',
        value: `The new information was correctly sent to the ticket you previously opened.`,
      });
    }
    else {
      // When the message is sent in a DM. Could either be in response to a DM or an interaction.
      if (message) {
        response.embeds[0].title = `Message Sent`;
        response.embeds[0].description = message.content;
      }
      else if (interaction) {
        // No message should be sent here.
      }
    }
  }
  
  return response;
}

/**
 * Message sent to the user when a moderator responds to the ticket.
 * @this discord.js/Client
 * @param {discord.js/Message} message - The message that was sent to the bot to update the ticket.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function newResponse(message) {
  let response = {
    embeds: [{
      title: `New Response`,
      color: 0x00ff00,
      description: message.content,
      fields: [
        {
          name: 'Mod Info',
          value: `${message.author}`,
        },
      ],
      footer: {
        text: `Mod Team - Ticket: ${message.channel.name}`,
        icon_url: `${message.guild.iconURL()}`,
      },
    }],
    files: message.attachments.map(v=>v),
  };
  
  return response;
}

/**
 * Message sent to the user when a moderator closes the ticket.
 * @this discord.js/Client
 * @param {discord.js/ThreadChannel} ticket - The ticket being closed.
 * @param {discord.js/User} moderator - The moderator who closed the ticket.
 * @param {string} [reason] - The reason given for closing the ticket.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function closeConfirmation(ticket, moderator, reason) {
  let response = {
    embeds: [{
      title: `Ticket Closed`,
      color: 0xaa0000,
      description: `Ticket \`${ticket.name}\` was closed.`,
      fields: [
        {
          name: 'Closing Reason',
          value: reason ? reason : 'No reason given.',
        },
        {
          name: 'Mod Info',
          value: `${moderator}`,
        },
      ],
      footer: {
        text: `Mod Team - Ticket: ${ticket.name}`,
        icon_url: `${ticket.guild.iconURL()}`,
      },
    }],
  };
  
  return response;
}

/**
 * The first message that will appear at the start of a newly created ticket thread.
 * @this discord.js/Client
 * @param {discord.js/GuildMember} member - The guild member who created the ticket.
 * @returns {discord.js/BaseMessageOptions} The options for creating and sending the message.
 */
export async function newTicket(member) {
  let response = {
    embeds: [{
      title: `New Ticket`,
      color: 0x00aa00,
      description: `Type a message in this channel to reply. Messages starting with the server prefix \`=\` are ignored, and can be used for staff discussion. Use the command \`=close <reason:optional>\` to close the ticket.`,
      fields: [
        {
          name: `User`,
          value: `${member.user}`,
          inline: true,
        },
        { // Note: Do not change the name or value; the module uses this field to determine which user opened the thread.
          name: `Id`,
          value: member.user.id,
          inline: true,
        },
        {
          name: `Roles`,
          value: member.roles.cache.filter(role => role.name !== '@everyone').map((role,id) => `<@&${id}>`).join(' '),
        },
      ],
      footer: {
        text: `${member.user.username}`,
        icon_url: `${member.user.avatarURL()}`,
      },
    }],
  };
  
  return response;
}
