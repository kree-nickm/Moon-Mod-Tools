/**
 * @module modules/pitbot/commands/removestrike
 */
import * as Strikes from '../strikeManager.mjs';

export async function handler(interaction) {
  let strikeId = interaction.options.getInteger('strike');
  await Strikes.remove.call(this, strikeId, interaction);
}

export const definition = {
  "name": "removestrike",
  "description": "Remove a strike from the records.",
  "options": [
    {
      "name": "strike",
      "description": "The ID of the strike to remove. Use /strikes to find the ID.",
      "type": 4,
      "required": true,
      "min_value": 1,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
