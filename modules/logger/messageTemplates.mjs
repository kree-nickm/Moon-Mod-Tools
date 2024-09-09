/**
 * All of the templates for messages sent by the logger module.
 * @module modules/logger/messageTemplates
 */

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

function durationString(ms) {
  if (ms > 86400000 * 2)
    return `${Math.round(ms/86400000)} days`;
  else if (ms > 3600000 * 3)
    return `${Math.round(ms/3600000)} hours`;
  else if (ms > 60000 * 3)
    return `${Math.round(ms/60000)} minutes`;
  else
    return `${Math.round(ms/1000)} seconds`;
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
          value: `${invite.maxAge}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}

export async function memberAdded(member, invite) {
  let age = durationString(member.joinedTimestamp - member.user.createdTimestamp);
  let isNewAcct = member.joinedTimestamp - member.user.createdTimestamp < 86400000 * 7;
  let response = {
    embeds: [{
      title: `Member Added`,
      color: 0x00ff00,
      fields: [
        {
          name: 'User',
          value: `${member.user.username} (${member.user.id}) ${member.user}`,
        },
        {
          name: 'Account Creation Date',
          value: `<t:${Math.round(member.user.createdTimestamp/1000)}:f>`,
        },
        {
          name: 'Server Joined Date',
          value: `<t:${Math.round(member.joinedTimestamp/1000)}:f>`,
        },
        {
          name: 'Account Age',
          value: isNewAcct ? `:warning: ${age} :warning:` : `${age}`,
          inline: true,
        },
        {
          name: 'Member Count',
          value: `${member.guild.memberCount}`,
          inline: true,
        },
      ],
      thumbnail: {url: member.user.avatarURL()},
      timestamp: new Date().toISOString(),
    }],
  };
  
  if (invite) {
    response.embeds[0].fields.push({
      name: 'Invite',
      value: typeof(invite)==='string' ?
        invite :
        `\`\`\`Code: ${invite.code}\nInviter: ${invite.inviter}\nCreated: ${invite.createdAt}\nExpires: ${invite.expiresAt}\nType: ${invite.type}\`\`\``,
    });
  }
  
  return response;
}

export async function memberRemoved(member) {
  let age = durationString(member.joinedTimestamp - member.user.createdTimestamp);
  let duration = durationString(Date.now() - member.joinedTimestamp);
  let response = {
    embeds: [{
      title: `Member Removed`,
      color: 0xff0000,
      fields: [
        {
          name: 'User',
          value: `${member.user.username} (${member.user.id}) ${member.user}`,
        },
        {
          name: 'Account Creation Date',
          value: `<t:${Math.round(member.user.createdTimestamp/1000)}:f>`,
        },
        {
          name: 'Server Joined Date',
          value: `<t:${Math.round(member.joinedTimestamp/1000)}:f>`,
        },
        {
          name: 'Server Removed Date',
          value: `<t:${Math.round(Date.now()/1000)}:f>`,
        },
        {
          name: 'Account Age (On Join)',
          value: `${age}`,
          inline: true,
        },
        {
          name: 'Here For',
          value: `${duration}`,
          inline: true,
        },
        {
          name: 'Member Count',
          value: `${member.guild.memberCount}`,
          inline: true,
        },
      ],
      thumbnail: {url: member.user.avatarURL()},
      timestamp: new Date().toISOString(),
    }],
  };
  
  return response;
}