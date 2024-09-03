/**
 * Logs edited and deleted messages to a specified channel in a guild.
 * @module modules/logger
 */

/**
 * GuildMessages is required to see messages sent in a guild, and MessageContent is required to actually see the content of those messages.
 */
export const intents = ["GuildMessages","MessageContent"];

/**
 * Registers the event handlers for edited and deleted messages.
 * @see {@link module:modules/logger/log}
 */
export async function onStart(module) {
  await this.registerEventHandlerFile('modules/logger/log.mjs', {
    messageUpdate: 'messageUpdate',
    messageDelete: 'messageDelete',
    raw: 'raw',
  });
};

/**
 * Caches all messages that the bot can currently see.
 */
export async function onReady(module) {
  let logChannel = await this.client.channels.fetch(module.options.logChannelId);
  
  let channels = await logChannel.guild.channels.fetch();
  for(let [channelId, channel] of channels) {
    if (channel.partial)
      channel = await channel.fetch();
    if (channel.messages && channel.viewable) {
      let messages = await channel.messages.fetch();
      this.logDebug(`Fetched ${messages.size} messages from #${channel.name}.`);
    }
  }
  
  let threads = await logChannel.guild.channels.fetchActiveThreads();
  for(let [channelId, channel] of threads.threads) {
    if (channel.partial)
      channel = await channel.fetch();
    if (channel.messages && channel.viewable) {
      let messages = await channel.messages.fetch();
      this.logDebug(`Fetched ${messages.size} messages from #${channel.name}.`);
    }
  }
};
