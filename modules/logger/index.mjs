/**
 * Logs edited and deleted messages to a specified channel in a guild, and joins/leaves in another.
 * @module modules/logger
 */
import { updateInvites } from './log.mjs';

/**
 * GuildMessages is required to see messages sent in a guild, and MessageContent is required to actually see the content of those messages. GuildMembers is required to log user joins/leaves. GuildInvites is required in order to track what invite was used when a user joins. GuildModeration is needed to view the audit log, which is needed to determine when a user has been kicked.
 */
export const intents = ["GuildMessages","MessageContent","GuildMembers","GuildInvites","GuildModeration"];

/**
 * Registers the event handlers for edited and deleted messages.
 * @see {@link module:modules/logger/log}
 */
export async function onStart(module) {
  await this.listenerManager.createFromFile('modules/logger/log.mjs', {
    eventHandlers: {
      messageUpdate: 'messageUpdate',
      messageDelete: 'messageDelete',
      guildMemberAdd: 'guildMemberAdd',
      guildMemberUpdate: 'guildMemberUpdate',
      guildMemberRemove: 'guildMemberRemove',
      guildAuditLogEntryCreate: 'guildAuditLogEntryCreate', // Requires VIEW_AUDIT_LOG
      inviteCreate: 'inviteCreate', // Requires MANAGE_GUILD
      inviteDelete: 'inviteDelete', // Requires MANAGE_GUILD
    },
    nocache: true,
    source: {module:module.name},
  });
  module.memory = {
    pendingMembers: [],
    removedMembers: [],
  };
};

/**
 * Caches all messages that the bot can currently see.
 */
export async function onReady(module) {
  if (!module.options.msgLogChannelId && !module.options.joinLogChannelId) {
    throw new Error(`Neither msgLogChannelId nor joinLogChannelId was found in the logger module options in the configuration file.`);
  }
  
  let msgLogChannel = module.options.msgLogChannelId ? await this.client.channels.fetch(module.options.msgLogChannelId) : null;
  if (msgLogChannel) {
    let channels = await msgLogChannel.guild.channels.fetch();
    let threads = await msgLogChannel.guild.channels.fetchActiveThreads();
    let allChannels = channels.concat(threads.threads);
    await Promise.all(allChannels.map(async channel => {
      if (channel.partial)
        channel = await channel.fetch();
      if (channel.messages && channel.viewable) {
        try {
          let messages = await channel.messages.fetch();
          if (channel.isThread())
            this.logDebug(`Fetched ${messages.size} messages from: #${channel.parent.name}-->"${channel.name}"`);
          else
            this.logDebug(`Fetched ${messages.size} messages from: #${channel.name}`);
        }
        catch(err) {
          this.logWarn(`Could not cache messages in channel: ${channel.name} (${channel.id}):`, err.message);
        }
      }
    }));
  }
  
  let joinLogChannel = module.options.joinLogChannelId ? await this.client.channels.fetch(module.options.joinLogChannelId) : null;
  if (joinLogChannel) {
    let members = await joinLogChannel.guild.members.fetch();
    this.logDebug(`Fetched ${members.size} members from: ${joinLogChannel.guild.name}`);
    
    await updateInvites.call(this.client);
  }
};

export async function onUnload(module) {
  await module.database?.close();
  this.listenerManager.listeners
    .filter(lis => lis.source?.module === module.name)
    .forEach(lis => lis.delete());
  module.memory = {};
}
