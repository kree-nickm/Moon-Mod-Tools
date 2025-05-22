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
  let module = this.master.modules.logger;
  
  if (newMessage.partial)
    newMessage = await newMessage.fetch();
  
  // Some edits don't need to be logged.
  if (newMessage.author.bot || !newMessage.editedTimestamp)
    return;
  
  // Assume each guild only has one log channel, and each log channel only reports messages from its guild.
  let logChannel = await this.channels.fetch(module.options.msgLogChannelId);
  if (!logChannel || logChannel.guildId !== newMessage.guildId)
    return;
  
  let content = ``;
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
      if (!oldMessage?.attachments?.has(attachmentId)) {
        embeds.push(await Messages.attachmentToEmbed.call(this, attachment, {title:'Attachment Added'}));
        files.push(attachment);
      }
    }
  }
  oldAttachList = oldAttachList.map(attachment => `[${attachment.name}](${attachment.url}) (${attachment.contentType})`).join(', ');
  newAttachList = newAttachList.map(attachment => `[${attachment.name}](${attachment.url}) (${attachment.contentType})`).join(', ');
  
  // Show the old (if possible) and new messages and a brief list of attachments, if any.
  if (oldMessage && !isNaN(oldMessage.content?.length))
  {
    if(oldMessage.content.length > 1024) {
      mainFields.push({
        name: 'Old Message Too Long',
        value: '*Old message content is instead shown above this embed.*',
      });
      content = `${oldMessage.content}`;
    }
    else {
      mainFields.push({
        name: 'Old Message',
        value: `${oldMessage.content}`,
      });
    }
    if (oldAttachList.length)
      mainFields.push({
        name: 'Old Attachments',
        value: oldAttachList.slice(0,1024), // TODO: Move somewhere else if too long.
      });
  }
  else
  {
    mainFields.push({
      name: 'Uh oh!',
      value: `*Old message content can't be fetched, because it is too old.*`,
    });
    //this.master.logDebug(`Too-old message:`, oldMessage);
  }
  
  if(newMessage.content.length > 1024) {
    let temp = content.length ? content + `\n# __New Message__\n${newMessage.content}` : `${newMessage.content}`;
    if(temp.length > 2000) {
      mainFields.push({
        name: 'New Message Too Long',
        value: `*And it's also too long to be shown with the old message, so only the old message is shown.*`,
      });
    }
    else
    {
      content = temp;
      mainFields.push({
        name: 'New Message Too Long',
        value: '*New message content is instead shown above this embed.*',
      });
    }
  }
  else {
    mainFields.push({
      name: 'New Message',
      value: `${newMessage.content}`,
    });
  }
  
  if (newAttachList.length)
    mainFields.push({
      name: 'New Attachments',
      value: newAttachList.slice(0,1024), // TODO: Move somewhere else if too long.
    });
  
  // Basic information about the change.
  mainFields.push({
    name: `Link`,
    value: `${newMessage.url}`,
    inline: true,
  });
  mainFields.push({
    name: `When`,
    value: `<t:${Math.round(newMessage.editedTimestamp/1000)}:R>`,
    inline: true,
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
    content: content.slice(0,2000),
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
  if (!logChannel || !message?.guildId || logChannel.guildId !== message?.guildId)
    return;
  
  let content = ``;
  let embeds = [];
  let mainFields = [];
  
  // Collect the message's attachments so they can be reported in the logger.
  let files = [];
  if (message?.attachments?.size) {
    for(let [attachmentId, attachment] of message?.attachments??[]) {
      embeds.push(await Messages.attachmentToEmbed.call(this, attachment, {title:'Attachment Removed'}));
      files.push(attachment);
    }
  }
  
  // Show the old message if possible.
  if (message && !isNaN(message.content?.length))
  {
    if(message.content.length > 1024) {
      mainFields.push({
        name: 'Message Too Long',
        value: '*Message content is instead shown above this embed.*',
      });
      content = `${message.content}`;
    }
    else {
      mainFields.push({
        name: 'Message',
        value: `${message.content}`,
      });
    }
  }
  else
  {
    mainFields.push({
      name: 'Uh oh!',
      value: `*Old message content can't be fetched, because it is too old.*`,
    });
    //this.master.logDebug(`Too-old message:`, message);
  }
  
  // Check for embeds.
  if (message && message.embeds?.length > 0)
  {
    mainFields.push({
      name: 'Embeds',
      value: `Message had ${message.embeds.length} embed(s), see below.`,
    });
    for (let embed of message.embeds) {
      embeds.push(embed.data);
    }
  }
  
  // Data to help mods find when/where this message was.
  if (message && !isNaN(message.url?.length))
  {
    mainFields.push({
      name: `Link`,
      value: `${message.url}`,
      inline: true,
    });
  }
  else if(message)
  {
    mainFields.push({
      name: 'Original Date',
      value: `<t:${Math.round(message.createdTimestamp/1000)}:f>`,
      inline: true,
    });
  }
  
  // Basic information about the change.
  mainFields.push({
    name: `When`,
    value: `<t:${Math.round(Date.now()/1000)}:R>`,
    inline: true,
  });
  
  try {
    let auditLogs = await message.guild.fetchAuditLogs();
    let msgEntry = auditLogs?.entries?.find(entry => entry.action === 72 && entry.targetId === message.id);
    let deleter = await msgEntry?.executor?.fetch();
    if(deleter) {
      mainFields.push({
        name: `Deleted By`,
        value: `${deleter}`,
      });
    }
  }
  catch(err) {
    this.master.logWarn(`Error searching audit log:`, error);
  }
  
  // Construct the primary embed object and add it onto the front of the embeds.
  embeds.unshift({
    title: 'Message Deleted',
    description: message?.author
      ? `\`${message.author.username}\` ${message.author} (${message.author.id})`
      : message?.channelId
      ? `In channel <#${message.channelId}>`
      : '*Cannot fetch any message properties.*',
    color: 0xff0000,
    fields: mainFields,
    timestamp: new Date().toISOString(),
  });
  
  await logChannel.send({
    content: content.slice(0,2000),
    embeds,
    files,
  });
};

//-----------------------------------------------------------------------------

/**
 * Log the user joining.
 * @param {?discord.js/GuildMember} member - The guild member who was added.
 */
export async function guildMemberAdd(member) {
  let module = this.master.modules.logger;
  if (!module.options.joinLogChannelId)
    return;
  
  if(member.pending) {
    this.master.logDebug(`Guild member onboarding: ${member.id}`);
    module.memory.pendingMembers.push(member.id);
    // Don't let the array just grow forever.
    if (module.memory.pendingMembers.length > 20)
      module.memory.pendingMembers.shift();
    return;
  }
  
  await processJoin.call(this, member);
};

export async function guildMemberUpdate(oldMember, member) {
  let module = this.master.modules.logger;
  if (!module.options.joinLogChannelId)
    return;
  
  if (member.partial)
    member = await member.fetch();
  
  if(!member.pending) {
    if(module.memory.pendingMembers.includes(member.id) || oldMember?.pending) {
      module.memory.pendingMembers = module.memory.pendingMembers.filter(id => id !== member.id);
      this.master.logDebug(`Guild member finished onboarding: ${member.id}`);
      await processJoin.call(this, member);
    }
  }
};

async function processJoin(member) {
  let module = this.master.modules.logger;
  
  if (module.memory.pendingMembers.length)
    this.master.logDebug(`Guild members still pending:`, module.memory.pendingMembers);
  
  if (member.partial)
    member = await member.fetch();
  
  // Assume each guild only has one log channel, and each log channel only reports joins/leaves from its guild.
  let logChannel = await this.channels.fetch(module.options.joinLogChannelId);
  if (!logChannel || logChannel.guild.id !== member.guild.id) {
    this.master.logDebug(`Incorrect guild joined. Expected: ${logChannel?.guild.name}. Got: $member.guild.name{}.`);
    return;
  }
  
  // Note: This might not work with pending members.
  let inviteUsed;
  if (module.memory.invites) {
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
  
  //TODO: Log an extra message in alertLogChannelId for new accounts.
  
  this.master.logDebug(`Guild member joined: ${member.id}`);
  await logChannel.send(await Messages.memberAdded.call(this, member, inviteUsed));
}

//-----------------------------------------------------------------------------

export async function guildAuditLogEntryCreate(entry, guild) {
  this.master.logDebug(`Audit log: ${entry.actionType} ${entry.targetType} ${entry.targetId}: ${entry.reason}`);
  let module = this.master.modules.logger;
  if (entry.action === 20 || entry.action === 21 || entry.action === 22) {
    if(entry.targetId)
      module.memory.removedMembers.push({
        id: entry.id,
        type: entry.action,
        executorId: entry.executorId,
        targetId: entry.targetId,
        reason: entry.reason,
      });
    else
      this.master.logWarn(`Audit log reported a confusing entry:`, entry);
  }
}

/**
 * Log the user leaving or being kicked.
 * @param {?discord.js/GuildMember} member - The guild member who was removed.
 */
export async function guildMemberRemove(member) {
  let module = this.master.modules.logger;
  if (!module.options.joinLogChannelId)
    return;
  
  let user = await this.users.fetch(member.id);
  
  // If they haven't even finished joining, don't log anything.
  if (member.pending || module.memory.pendingMembers.includes(member.id)) {
    this.master.logDebug(`Guild member removed while still pending: ${user.username} (${user.id})`);
    module.memory.pendingMembers = module.memory.pendingMembers.filter(id => id !== user.id);
    return;
  }
  
  // Assume each guild only has one log channel, and each log channel only reports joins/leaves from its guild.
  let logChannel = await this.channels.fetch(module.options.joinLogChannelId);
  if (!logChannel || logChannel.guild.id !== member.guild?.id)
    return;
  
  // Give the audit log time to update so we can see if the removal reason is in it.
  await new Promise((resolve, reject) => setTimeout(() => resolve(), 500));
  
  let reason = 'User left the server.';
  let auditLog = module.memory.removedMembers.findLast(audit => audit.targetId === user.id);
  if (auditLog) {
    if (auditLog.type === 20 && auditLog.executorId)
      reason = `User was kicked by <@${auditLog.executorId}>.` + (auditLog.reason ? `\n> ${auditLog.reason}` : '');
    else if (auditLog.type === 20)
      reason = 'User removed by auto-sync.';
    else if (auditLog.type === 21)
      reason = 'User was pruned.';
    else if (auditLog.type === 22 && auditLog.executorId)
      reason = `User was banned by <@${auditLog.executorId}>.` + (auditLog.reason ? `\n> ${auditLog.reason}` : '');
    else
      this.master.logWarn(`User had an unknown record in the audit log:`, auditLog);
    module.memory.removedMembers = module.memory.removedMembers.filter(audit => audit.targetId !== user.id);
  }
  
  this.master.logDebug(`Guild member removed: ${user.username} (${user.id}): "${reason}"`);
  logChannel.send(await Messages.memberRemoved.call(this, {user, member, reason}));
};

//-----------------------------------------------------------------------------

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
