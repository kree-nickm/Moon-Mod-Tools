import { getOrCreateThread } from './ticket.mjs';

export async function handler(interaction) {
  // Verify that the user is a member of the guild we are handling mod mail for.
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (!interaction.member || interaction.member.guild.id !== mailChannel.guild.id) {
    return;
  }
  
  // Find the user's active thread, or create a new one.
  let myThread = await getOrCreateThread(mailChannel, interaction.member);
  
  // Add the user's message to the thread.
  await myThread.send({
    embeds: [
      {
        title: `Reported Message`,
        description: interaction.targetMessage.content,
      },
    ],
  });
  await interaction.reply({content:`Your report has been sent to the mods for review. If the mods need to contact you, this bot will DM you their messages.`});
};

export const definition = {
  name: "modmail",
  type: 3,
};
