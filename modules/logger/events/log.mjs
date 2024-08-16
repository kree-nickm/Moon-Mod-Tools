/**
 * Requires the GuildMessages intent in order to receive this event.
 * Requires the MessageContent intent in order to see any content of messages. MESSAGE CONTENT must also be enabled in the bot's Discord developer portal.
 * Requires the Message partial in order to receive any events on messages that existed before the bot logged in.
 */

function attachmentToEmbed(attachment, overwrites={}) {
  let embed = {
    description: `<${attachment.url}> (${attachment.id})`,
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
  
  if (attachment.contentType.startsWith('image/') || attachment.contentType.startsWith('video/')) {
    embed.fields.push({
      name: 'Size (Pixels)',
      value: `${attachment.width}x${attachment.height}`,
    });
    if (attachment.contentType.startsWith('image/'))
      embed.image = {
        url: attachment.url,
        proxy_url: attachment.proxyURL,
      };
    if (attachment.contentType.startsWith('video/'))
      embed.video = {
        url: attachment.url,
        proxy_url: attachment.proxyURL,
      };
  }
  
  if (attachment.contentType.startsWith('audio/')) {
    embed.fields.push({
      name: 'Duration',
      value: `${attachment.duration}s`,
    });
  }
  
  return Object.assign(embed, overwrites);
}

export async function messageUpdate(oldMessage, newMessage) {
  if (oldMessage?.partial)
    oldMessage = await oldMessage.fetch();
  if (newMessage.partial)
    newMessage = await newMessage.fetch();
  
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.logChannelId);
  if (logChannel.guildId !== newMessage.guildId)
    return;
  
  let embeds = [];
  let mainFields = [];
  
  let oldAttachList = [];
  let newAttachList = [];
  if (oldMessage?.attachments?.size || newMessage?.attachments?.size) {
    for(let [attachmentId, attachment] of oldMessage?.attachments??[]) {
      oldAttachList.push(attachment);
      if (!newMessage.attachments.has(attachmentId)) {
        embeds.push(attachmentToEmbed(attachment, {title:'Attachment Removed'}));
      }
    }
    for(let [attachmentId, attachment] of newMessage.attachments??[]) {
      newAttachList.push(attachment);
      if (!oldMessage?.attachments.has(attachmentId)) {
        embeds.push(attachmentToEmbed(attachment, {title:'Attachment Added'}));
      }
    }
  }
  oldAttachList = oldAttachList.map(attachment => `[${attachment.name}](${attachment.url}) (${attachment.contentType})`).join(', ');
  newAttachList = newAttachList.map(attachment => `[${attachment.name}](${attachment.url}) (${attachment.contentType})`).join(', ');
  
  // Show the old (if possible) and new messages and a brief list of attachments, if any.
  if (oldMessage && 'content' in oldMessage)
  {
    mainFields.push({
      name: 'Old Message',
      value: oldMessage.content,
    });
    if (oldAttachList.length)
      mainFields.push({
        name: 'Old Attachments',
        value: oldAttachList,
      });
  }
  else
  {
    mainFields.push({
      name: 'Uh oh!',
      value: `Old message content can't be fetched, because it is too old.`,
    });
  }
  mainFields.push({
    name: 'New Message',
    value: newMessage.content,
  });
  if (newAttachList.length)
    mainFields.push({
      name: 'New Attachments',
      value: newAttachList,
    });
  
  // Basic information about the change.
  mainFields.push({
    name: `Link`,
    value: `${newMessage.channel} / ${newMessage.url}`,
  });
  mainFields.push({
    name: `When`,
    value: `<t:${Math.round(newMessage.editedTimestamp/1000)}:R>`,
  });
  
  embeds.unshift({
    title: 'Message Updated',
    description: `\`${newMessage.author.username}\` ${newMessage.author} (${newMessage.author.id})`,
    color: 0x6666ff,
    fields: mainFields,
    /*footer: {
      text: ``,
    },*/
  });
  
  await logChannel.send({
    embeds,
  });
};

export async function messageDelete(message) {
  if (message.partial)
    message = await message.fetch();
  
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.logChannelId);
  if (logChannel.guildId !== message.guildId)
    return;
  
  let embeds = [];
  let mainFields = [];
  
  if (message.attachments?.size)
    for(let [attachmentId, attachment] of message.attachments)
      embeds.push(attachmentToEmbed(attachment, {title:'Attachment Removed'}));
  
  // Show the old message if possible.
  if ('content' in message)
  {
    mainFields.push({
      name: 'Message',
      value: message.content,
    });
    mainFields.push({
      name: `Link`,
      value: `${message.channel} / ${message.url}`,
    });
  }
  else
  {
    mainFields.push({
      name: 'Uh oh!',
      value: `Old message content can't be fetched, because it is too old.`,
    });
  }
  
  // Basic information about the change.
  mainFields.push({
    name: `When`,
    value: `<t:${Math.round(Date.now()/1000)}:R>`,
  });
  
  embeds.unshift({
    title: 'Message Deleted',
    description: message.author ? `\`${message.author.username}\` ${message.author} (${message.author.id})` : `in channel ${message.channel}`,
    color: 0xff0000,
    fields: mainFields,
    /*footer: {
      text: ``,
    },*/
  });
  
  await logChannel.send({
    embeds,
  });
};

export async function raw(packet) {
  //console.log(packet);
  if(packet.t === 'MESSAGE_UPDATE') {
    let timestamp = Date.parse(packet.d.timestamp);
    if(timestamp < this.readyTimestamp) {
      let channel = await this.channels.fetch(packet.d.channel_id);
      let message = await channel.messages.fetch(packet.d.id);
      this.emit('messageUpdate', null, message);
    }
  }
  /*else if(packet.t === 'MESSAGE_DELETE') {
    let channel = await this.channels.fetch(packet.d.channel_id);
    if (!channel.messages.cache.get(packet.d.id)) { // TODO: doesn't work. how check if cached? otherwise event will fire twice
      this.emit('messageDelete', {channel, channelId:packet.d.channel_id, guildId:packet.d.guild_id});
    }
  }*/
  /*else {
    this.master.logDebug(`Raw Event:`, packet);
  }*/
};
