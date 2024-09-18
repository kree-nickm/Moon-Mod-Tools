/**
 * @module modules/pitbot/commands/removestrike
 */
import * as Strikes from '../strikeManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(interaction.user.id)) {
    await interaction.reply({ephemeral:true, content:"You don't have permission to do that."});
    return;
  }
  
  let strikeId = interaction.options.getInteger('strike');
  await Strikes.remove.call(this, strikeId, {interaction});
  if(!interaction.replied)
    await interaction.reply({ephemeral:true,content:'Check log channel for confirmation.'});
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
