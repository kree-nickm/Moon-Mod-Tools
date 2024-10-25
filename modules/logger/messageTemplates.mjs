/**
 * All of the templates for messages sent by the logger module.
 * @module modules/logger/messageTemplates
 */
import * as Util from '../../imports/util.mjs';

/**
 * Convert an Attachment into an embed object.
 * @param {discord.js/Attachment} attachment - The Attachment object reported by Discord.js
 * @param {Object} overwrites - Properties to include in the embed object after it has been populated with Attachment data.
 * @returns {Object} An object to be included in the embeds array of a message's options before sending it.
 */
export async function attachmentToEmbed(attachment, overwrites={}) {
  let embed = {
    fields: [
      {
        name: 'Name',
        value: attachment.name ?? '?',
      },
      {
        name: 'Content Type',
        value: attachment.contentType ?? '?',
      },
      {
        name: 'Size (Bytes)',
        value: attachment.size ?? '?',
      },
    ],
  };
  
  if (attachment.title)
    embed.fields.push({
      name: 'Title',
      value: attachment.title,
    });
  
  if (attachment.description)
    embed.fields.push({
      name: 'Description',
      value: attachment.description,
    });
  
  if(attachment.width && attachment.height)
    embed.fields.push({
      name: 'Size (Pixels)',
      value: `${attachment.width}x${attachment.height}`,
    });
  
  if (attachment.duration)
    embed.fields.push({
      name: 'Duration',
      value: `${attachment.duration}s`,
    });
  
  return Object.assign(embed, overwrites);
}

export async function inviteCreated(invite) {
  let response = {
    embeds: [{
      title: `Invite Created`,
      color: 0x3333cc,
      description: ``,
      fields: [
        {
          name: 'Inviter',
          value: `${invite.inviter}`,
        },
        {
          name: 'For',
          value: `${invite.channel??invite.guild??'unknown'}`,
        },
        {
          name: 'Code',
          value: `${invite.code}`,
          inline: true,
        },
        {
          name: 'Created',
          value: `<t:${Math.round(invite.createdTimestamp/1000)}:R>`,
          inline: true,
        },
        {
          name: 'Expires',
          value: `<t:${Math.round(invite.expiresTimestamp/1000)}:R>`,
          inline: true,
        },
        {
          name: 'Max Uses',
          value: `${invite.maxUses}`,
          inline: true,
        },
        {
          name: 'Max Age',
          value: Util.durationString(invite.maxAge*1000),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

export async function memberAdded(member, invite) {
  let age = Util.durationString(member.joinedTimestamp - member.user.createdTimestamp);
  let isNewAcct = member.joinedTimestamp - member.user.createdTimestamp < 86400000 * 7;
  let response = {
    embeds: [{
      title: `Member Added`,
      description: `${member.user} joined the server.`,
      color: 0x00ff00,
      fields: [
        {
          name: 'Account Age',
          value: isNewAcct ? `:warning: ${age} :warning:` : `${age}`,
          inline: true,
        },
        {
          name: 'Username',
          value: `\`${member.user.username}\``,
          inline: true,
        },
        {
          name: 'ID',
          value: member.user.id,
          inline: true,
        },
      ],
      thumbnail: {url: member.user.avatarURL()},
      timestamp: member.joinedAt,
    }],
  };
  
  if (invite) {
    if (invite.removed) {
      response.embeds[0].fields.push({
        name: 'Invite Used',
        value: `${invite.code} (deleted)`,
        inline: true,
      });
      response.embeds[0].fields.push({
        name: 'Invite Creator',
        value: `${invite.inviter}`,
        inline: true,
      });
      response.embeds[0].fields.push({
        name: 'Invite Date',
        value: `<t:${Math.round(invite.createdTimestamp/1000)}:f>`,
        inline: true,
      });
    }
    else {
      response.embeds[0].fields.push({
        name: 'Invite Used',
        value: invite.code,
        inline: true,
      });
      response.embeds[0].fields.push({
        name: 'Invite Max Uses',
        value: invite.maxUses ? invite.maxUses : 'infinite',
        inline: true,
      });
      response.embeds[0].fields.push({
        name: 'Invite Lifetime',
        value: Util.durationString(invite.maxAge*1000),
        inline: true,
      });
    }
  }
  
  return response;
}

export async function memberRemoved({user, member, reason}) {
  let duration = member.joinedTimestamp ? Util.durationString(Date.now() - member.joinedTimestamp) : 'unknown';
  let response = {
    embeds: [{
      title: `Member Removed`,
      description: `**Reason:** ${reason}`,
      color: 0xff0000,
      fields: [
        {
          name: 'Username',
          value: `\`${user.username}\``,
          inline: true,
        },
        {
          name: 'ID',
          value: user.id,
          inline: true,
        },
        {
          name: 'Here For',
          value: `${duration}`,
          inline: true,
        },
      ],
      thumbnail: {url: user.avatarURL()},
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}