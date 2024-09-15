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
  if (newMessage.partial)
    newMessage = await newMessage.fetch();
  // We can't actually fetch the old message. If it is partial, just forget it.
  if (oldMessage?.partial)
    oldMessage = null;
  
  if (newMessage.author.bot || !newMessage.editedTimestamp) {
    return;
  }
  
  // Assume each guild only has one log channel, and each log channel only reports messages from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.msgLogChannelId);
  if (!logChannel || logChannel.guildId !== newMessage.guildId)
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
    timestamp: new Date().toISOString(),
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
  // Assume each guild only has one log channel, and each log channel only reports messages from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.msgLogChannelId);
  if (!logChannel || !message.guildId || logChannel.guildId !== message.guildId)
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
  let channel;
  if (message.partial)
  {
    channel = await this.channels.fetch(message.channelId);
    mainFields.push({
      name: 'Uh oh!',
      value: `Old message content can't be fetched, because it is too old.`,
    });
    mainFields.push({
      name: 'Original Date',
      value: `<t:${Math.round(message.createdTimestamp/1000)}:f>`,
    });
  }
  else
  {
    channel = message.channel;
    mainFields.push({
      name: 'Message',
      value: message.content,
    });
    mainFields.push({
      name: `Link`,
      value: `${channel} / ${message.url}`,
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
    description: message.author ? `\`${message.author.username}\` ${message.author} (${message.author.id})` : `In channel ${channel}`,
    color: 0xff0000,
    fields: mainFields,
    timestamp: new Date().toISOString(),
  });
  
  await logChannel.send({
    embeds,
    files,
  });
};

/**
 * Log the user joining.
 * @param {?discord.js/GuildMember} member - The guild member who was added.
 */
export async function guildMemberAdd(member) {
  if (member.partial)
    member = await member.fetch();
  
  // Assume each guild only has one log channel, and each log channel only reports joins/leaves from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.joinLogChannelId);
  if (!logChannel || logChannel.guild.id !== member.guild.id)
    return;
  
  let inviteUsed;
  if (this.master.modules.logger.memory.invites) {
    let changes = await updateInvites.call(this);
    if (Object.entries(changes).length === 2 && (Object.values(changes)[1] === 1 || Object.values(changes)[1] === -1))
      inviteUsed = Object.keys(changes)[1];
    if (inviteUsed) {
      if (changes.removed[inviteUsed]) {
        inviteUsed = changes.removed[inviteUsed];
        inviteUsed.removed = true;
      }
      else
        inviteUsed = await logChannel.guild.invites.fetch(inviteUsed);
    }
  }
  
  await logChannel.send(await Messages.memberAdded.call(this, member, inviteUsed));
};

/**
 * Log the user leaving or being kicked.
 * @param {?discord.js/GuildMember} member - The guild member who was removed.
 */
export async function guildMemberRemove(member) {
  if (member.partial)
    member = await member.fetch();
  
  // Assume each guild only has one log channel, and each log channel only reports joins/leaves from its guild.
  let logChannel = await this.channels.fetch(this.master.modules.logger.options.joinLogChannelId);
  if (!logChannel || logChannel.guild.id !== member.guild.id)
    return;
  
  logChannel.send(await Messages.memberRemoved.call(this, member));
};

let updateInvitesTimeout;
export async function updateInvites() {
  if (updateInvitesTimeout)
    clearTimeout(updateInvitesTimeout);
  let joinLogChannel = this.master.modules.logger.options.joinLogChannelId ? await this.channels.fetch(this.master.modules.logger.options.joinLogChannelId) : null;
  if (joinLogChannel) {
    let invites;
    try {
      invites = await joinLogChannel.guild.invites.fetch();
    }
    catch(err) {
      this.master.logWarn(`Bot cannot access guild invites; perhaps it lacks the MANAGE_GUILD permission. As a result, created invites will not be logged, and the invite used when a member joins will not be reported.`);
      this.master.logDebug(err);
      return {};
    }
    let changes = {removed:{}};
    let previousUses = this.master.modules.logger.memory.invites ?? {};
    this.master.modules.logger.memory.invites = {};
    for(let [inviteId, invite] of invites) {
      // Check if the invite usage has changed.
      let uses = invite.uses;
      let prevUses = previousUses[inviteId]?.uses ?? 0;
      if (!previousUses[inviteId])
        changes[inviteId] = uses;
      else if (prevUses < uses)
        changes[inviteId] = uses - prevUses;
      
      // Store the invite data in memory.
      this.master.modules.logger.memory.invites[inviteId] = {invite, uses};
    }
    for(let inviteId in previousUses) {
      if (!this.master.modules.logger.memory.invites[inviteId]) {
        changes[inviteId] = -1;
        changes.removed[inviteId] = previousUses[inviteId].invite;
      }
    }
    this.master.logDebug(`Fetched ${Object.entries(this.master.modules.logger.memory.invites).length} invites from ${joinLogChannel.guild.name}.`, `Changes since last fetch:`, changes);
    return changes;
  }
  return {};
}

export async function inviteCreate(inviteChanged) {
  await updateInvites.call(this);
  let joinLogChannel = this.channels.cache.get(this.master.modules.logger.options.joinLogChannelId);
  if (joinLogChannel)
    await joinLogChannel.send(await Messages.inviteCreated(inviteChanged));
}

export async function inviteDelete(inviteChanged) {
  // Delay this for half a second in case the invite is being deleted because it was one-time-use, and the member was added to the guild. This will let guildMemberAdd see the invite before it gets removed from memory.
  updateInvitesTimeout = setTimeout(async () => await updateInvites.call(this), 500);
}
