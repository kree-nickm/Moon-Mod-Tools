export async function handler(interaction) {
  this.master.logInfo(`Shutting down...`);
  await interaction.reply({content:`See ya.`, ephemeral:true});
  await this.master._onShutdown();
  await this.destroy();
  this.master.logInfo(`See ya.`);
};

export const definition = {
  "name": "shutdown",
  "description": "Gracefully shuts down the bot.",
};
