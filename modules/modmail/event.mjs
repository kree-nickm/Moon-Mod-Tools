import { getOrCreateThread } from './ticket.mjs';

export async function messageCreate(message) {
  if (message.partial)
    message = await message.fetch();
  
  if (message.author.bot)
    return;
  
  let mailChannel = await this.channels.fetch(this.master.modules.modmail.options.mailChannelId);
  if (message.channel.id === mailChannel.id) {
    await modMailMessage(message);
  }
  else if (!message.inGuild()) {
    // Verify that the user is a member of the guild we are handling mod mail for.
    let member = await mailChannel.guild.members.fetch(message.author);
    if (!member) {
      return;
    }
    
    // Find the user's active thread, or create a new one.
    let myThread = await getOrCreateThread(mailChannel, member);
    
    // Add the user's message to the thread.
    await myThread.send({
      embeds: [
        {
          title: `New Message`,
          description: message.content,
        },
      ],
    });
  }
}

async function modMailMessage(message) {
}
