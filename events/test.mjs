export function handler(interaction) {
  this.master.logInfo(interaction);
  interaction.reply({content:`I see you.`, ephemeral:true});
};

export const data = {
  "name": "test",
  "description": "Doesn't do much.",
};
