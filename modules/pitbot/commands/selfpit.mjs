/**
 * @module modules/pitbot/commands/selfpit
 */
import * as Pits from '../pitManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let hours = interaction.options.getInteger('duration') ?? 24;
  let success = await Pits.pit.call(this, interaction.user, hours*(this.master.config.id === '1040775664539807804' ? 1000 : 3600000));
  if(!interaction.replied) {
    if (success)
      await interaction.reply({ephemeral:true, content:`You have successfully sent yourself to the pit for ${hours} hours.`});
    else
      await interaction.reply({ephemeral:true, content:`You already have an existing timeout.`});
  }
}

export const definition = {
  "name": "selfpit",
  "description": "Time yourself out for up to 72 hours. If not specified, the timeout duration will be 1 day.",
  "options": [
    {
      "name": "duration",
      "description": "Duration of the timeout in hours.",
      "type": 4,
      "min_value": 1,
      "max_value": 72,
    },
  ],
};
