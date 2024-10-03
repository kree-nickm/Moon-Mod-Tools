/**
 * @module modules/pitbot/commands/timeout
 */
import * as Strikes from '../strikeManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(interaction.user.id)) {
    await interaction.reply({ephemeral:true, content:"You don't have permission to do that."});
    return;
  }
  
  let user = interaction.options.getUser('user');
  let severity = interaction.options.getInteger('severity');
  let comment = interaction.options.getString('comment');
  await Strikes.add.call(this, user, interaction.user, severity, comment);
  if(!interaction.replied)
    await interaction.reply({ephemeral:true,content:'Check log channel for confirmation.'});
}

export const definition = {
  "name": "timeout",
  "description": "Issue a strike to a user.",
  "options": [
    {
      "name": "user",
      "description": "The user to strike.",
      "type": 6,
      "required": true,
    },
    {
      "name": "severity",
      "description": "Severity of the infraction, 1-5.",
      "type": 4,
      "required": true,
      "min_value": 1,
      "max_value": 5,
    },
    {
      "name": "comment",
      "description": "Reason for the strike.",
      "type": 3,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
