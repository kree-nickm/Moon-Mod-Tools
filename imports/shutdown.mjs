/**
 * Shuts down the bot. If you use this, make sure it's an owner-only command.
 * @module imports/shutdown
 */

export async function handler(interaction) {
  await interaction.reply({content:`See ya.`, ephemeral:true});
  await this.master._onShutdown();
  process.exit();
};

export const definition = {
  "name": "shutdown",
  "description": "Gracefully shuts down the bot. Only the bot owner can use this.",
};
