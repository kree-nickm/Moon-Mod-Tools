/**
 * Contains the event handlers for the logger module.
 * @module modules/logger/log
 */
import * as Messages from './messageTemplates.mjs';

/**
 * Because Discord.js only emits events for messages that are cached, we need to use this to determine which messages those are. Because when we use the raw event to log non-cached message changes, there is no other way the raw event can know if the Discord.js is also being emitted.
 */
var timers = {};

/**
 * Log the changes to the updated message.
 * @param {?discord.js/Message} oldMessage - The message before it was edited, or null if the message was not cached.
 * @param {discord.js/Message} newMessage - The newly edited message.
 */
export async function messageUpdate(oldMessage, newMessage) {
  // Prevent this function from running twice, since it will also always be called by the raw event handler.
  if(timers[newMessage.id]) {
    clearTimeout(timers[newMessage.id]);
    delete timers[newMessage.id];
  }
  else
    timers[newMessage.id] = true;
  
  if (oldMessage?.partial)
    oldMessage = await oldMessage.fetch();
  if (newMessage.partial)
    newMessage = await newMessage.fetch();
  
  // Assume each guild only has one log channel, and each log channel only reports messages from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.logChannelId);
  if (logChannel.guildId !== newMessage.guildId)
    return;
  
  let embeds = [];
  let mainFields = [];
  
  // Collect the messages' attachments so they can be reported in the logger.
  let files = [];
  let oldAttachList = [];
  let newAttachList = [];
  if (oldMessage?.attachments?.size || newMessage?.attachments?.size) {
    for(let [attachmentId, attachment] of oldMessage?.attachments??[]) {
      oldAttachList.push(attachment);
      if (!newMessage.attachments.has(attachmentId)) {
        embeds.push(await Messages.attachmentToEmbed.call(this, attachment, {title:'Attachment Removed'}));
        files.push(attachment);
      }
    }
    for(let [attachmentId, attachment] of newMessage.attachments??[]) {
      newAttachList.push(attachment);
      if (!oldMessage?.attachments.has(attachmentId)) {
        embeds.push(await Messages.attachmentToEmbed.call(this, attachment, {title:'Attachment Added'}));
        files.push(attachment);
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
  
  // Construct the primary embed object and add it onto the front of the embeds.
  embeds.unshift({
    title: 'Message Updated',
    description: `\`${newMessage.author.username}\` ${newMessage.author} (${newMessage.author.id})`,
    color: 0x6666ff,
    fields: mainFields,
  });
  
  await logChannel.send({
    embeds,
    files,
  });
};

/**
 * Log the message that was deleted.
 * @param {?discord.js/Message} message - The message before it was deleted, or null if the message was not cached.
 */
export async function messageDelete(message) {
  // Prevent this function from running twice, since it will also always be called by the raw event handler.
  if(timers[message.id]) {
    clearTimeout(timers[message.id]);
    delete timers[message.id];
  }
  else
    timers[message.id] = true;
  
  if (message.partial)
    message = await message.fetch();
  
  // Assume each guild only has one log channel, and each log channel only reports messages from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.logChannelId);
  if (logChannel.guildId !== message.guildId)
    return;
  
  let embeds = [];
  let mainFields = [];
  
  // Collect the message's attachments so they can be reported in the logger.
  let files = [];
  if (message.attachments?.size) {
    for(let [attachmentId, attachment] of message.attachments) {
      embeds.push(await Messages.attachmentToEmbed.call(this, attachment, {title:'Attachment Removed'}));
      files.push(attachment);
    }
  }
  
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
  
  // Construct the primary embed object and add it onto the front of the embeds.
  embeds.unshift({
    title: 'Message Deleted',
    description: message.author ? `\`${message.author.username}\` ${message.author} (${message.author.id})` : `in channel ${message.channel}`,
    color: 0xff0000,
    fields: mainFields,
  });
  
  await logChannel.send({
    embeds,
    files,
  });
};

/**
 * Runs when any event that we have the intents for is received from the Discord API. Necessary because Discord.js will not emit messageUpdate or messageDelete if the message is not cached.
 * @todo This isn't doing what it's supposed to anymore.
 * @param {Object} packet
 * @param {?string} packet.t - Event name
 * @param {?*} packet.d - Event data
 * @param {?integer} packet.s - Sequence number of event used for [resuming sessions]{@link https://discord.com/developers/docs/topics/gateway#resuming} and [heartbeating]{@link https://discord.com/developers/docs/topics/gateway#sending-heartbeats}
 * @param {integer} packet.op - [Gateway opcode]{@link https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes}, which indicates the payload type
 */
export async function raw(packet) {
  if(packet.t === 'MESSAGE_UPDATE') {
    if(!timers[packet.d.id]) {
      let channel = await this.channels.fetch(packet.d.channel_id);
      let message = await channel.messages.fetch(packet.d.id);
      timers[packet.d.id] = setTimeout(()=>{
        this.emit('messageUpdate', null, message);
      }, 500);
    }
    else
      delete timers[packet.d.id];
  }
  else if(packet.t === 'MESSAGE_DELETE') {
    if(!timers[packet.d.id]) {
      let channel = await this.channels.fetch(packet.d.channel_id);
      timers[packet.d.id] = setTimeout(()=>{
        this.emit('messageDelete', {id:packet.d.id, channel, channelId:packet.d.channel_id, guildId:packet.d.guild_id});
      }, 500);
    }
    else
      delete timers[packet.d.id];
  }
  //else {
  //  this.master.logDebug(`Raw Event:`, packet);
  //}
};
