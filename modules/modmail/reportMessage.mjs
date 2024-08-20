import { getOrCreateThread } from './ticket.mjs';
import * as Messages from './messageTemplates.mjs';

export async function handler(interaction) {
  // Verify that the user is a member of the guild we are handling mod mail for.
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (!interaction.member || interaction.member.guild.id !== mailChannel.guild.id) {
    return;
  }
  
  // Find the user's active thread, or create a new one.
  let myThread = await getOrCreateThread.call(this, mailChannel, interaction.member);
  
  // Add the user's message to the thread.
  await myThread.send(await Messages.messageReceived.call(this, {interaction}));
  await interaction.reply({content:`Your report has been sent to the mods for review. If you'd like to add to it, feel free to send any further information to this bot in a DM. If the mods need to contact you, this bot will DM you their messages.`});
}

export const definition = {
  name: 'modmail',
  type: 3,
};
