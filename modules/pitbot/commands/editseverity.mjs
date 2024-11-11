/**
 * @module modules/pitbot/commands/editseverity
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
  let severity = interaction.options.getInteger('severity');
  await Strikes.severity.call(this, strikeId, severity, {interaction});
  if(!interaction.replied)
    await interaction.reply({ephemeral:true, content:'Check log channel for confirmation.'});
}

export const definition = {
  "name": "editseverity",
  "description": "Edit the severity of a strike.",
  "options": [
    {
      "name": "strike",
      "description": "The ID of the strike to edit. Use /strikes to find the ID.",
      "type": 4,
      "required": true,
      "min_value": 1,
    },
    {
      "name": "severity",
      "description": "New severity of the infraction, 1-5.",
      "type": 4,
      "required": true,
      "min_value": 1,
      "max_value": 5,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
