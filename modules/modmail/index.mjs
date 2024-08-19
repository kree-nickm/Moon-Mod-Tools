/**
 * Requires the DirectMessages intent in order to receive any events for messages.
 * Requires the MessageContent intent in order to see any content of messages. MESSAGE CONTENT must also be enabled in the bot's Discord developer portal.
 * Requires the Channel partial to recognize when DM channels are created.
 */
export const intents = ["DirectMessages","MessageContent"];
export const partials = ["Channel"];

export async function onReady(bot, options) {
  let mailChannel = await bot.client.channels.fetch(bot.modules.modmail.options.mailChannelId);
  if (mailChannel?.isThreadOnly()) {
    await bot.registerEventHandlerFile('modules/modmail/event.mjs', {
      messageCreate: 'messageCreate',
    });
    await bot.registerApplicationCommand({filename:'modules/modmail/reportMessage.mjs', guildIds:[mailChannel.guildId]});
    bot.logInfo(`Module 'modmail' ready.`);
    // TODO: Fetch all archived modmails to build a database that associates a user with all of their threads.
  }
  else
    bot.logError(`modmail requires mailChannelId to be a forum channel.`);
};

/*
Users can create a ModMail ticket by either messaging the bot directly or using a right-click context menu on a message they'd like to report.
  Reporting a message via the context menu creates a ticket with a the first message being an embedded link to the reported message.
    If additional messages are reported while a user has an active ticket, the new report is just appended to the existing ticket.
Once a ticket is created, the user can message PitBot to communicate with the mod team via the ModMail queue and vice versa.
  Mods can use a command character (currently "=") to talk in a ticket without sending a message to the user.
Mods can manage the ticket with "lock", "unlock", and "close" commands.
  Lock and unlock stop/start the bot from messaging the reporter while the mods discuss the issue without needing to always use the command character.
*/
