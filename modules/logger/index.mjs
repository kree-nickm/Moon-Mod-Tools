/**
 * Logs edited and deleted messages to a specified channel in a guild, and joins/leaves in another.
 * @module modules/logger
 */
import { updateInvites } from './log.mjs';

/**
 * GuildMessages is required to see messages sent in a guild, and MessageContent is required to actually see the content of those messages. GuildMembers is required to log user joins/leaves. GuildInvites is required in order to track what invite was used when a user joins.
 */
export const intents = ["GuildMessages","MessageContent","GuildMembers","GuildInvites"];

/**
 * GuildMember might be required. Not sure, because I don't know what circumstances would cause a GuildMember to be partial.
 */
export const partials = ["Message","GuildMember"];

/**
 * Registers the event handlers for edited and deleted messages.
 * @see {@link module:modules/logger/log}
 */
export async function onStart(module) {
  await this.registerEventHandlerFile('modules/logger/log.mjs', {
    messageUpdate: 'messageUpdate',
    messageDelete: 'messageDelete',
    guildMemberAdd: 'guildMemberAdd',
    guildMemberRemove: 'guildMemberRemove',
    inviteCreate: 'inviteCreate',
    inviteDelete: 'inviteDelete',
  });
  module.memory = {};
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
    for(let [channelId, channel] of channels) {
      if (channel.partial)
        channel = await channel.fetch();
      if (channel.messages && channel.viewable) {
        let messages = await channel.messages.fetch();
        this.logDebug(`Fetched ${messages.size} messages from: #${channel.name}`);
      }
    }
    
    let threads = await msgLogChannel.guild.channels.fetchActiveThreads();
    for(let [channelId, channel] of threads.threads) {
      if (channel.partial)
        channel = await channel.fetch();
      if (channel.messages && channel.viewable) {
        let messages = await channel.messages.fetch();
        this.logDebug(`Fetched ${messages.size} messages from: #${channel.parent.name}-->${channel.name}`);
      }
    }
  }
  
  let joinLogChannel = module.options.joinLogChannelId ? await this.client.channels.fetch(module.options.joinLogChannelId) : null;
  if (joinLogChannel) {
    let members = await joinLogChannel.guild.members.fetch();
    this.logDebug(`Fetched ${members.size} members from: ${joinLogChannel.guild.name}`);
    
    await updateInvites.call(this.client);
  }
};

export async function onUnload(module) {
  // TODO: Unregister event handlers.
}
