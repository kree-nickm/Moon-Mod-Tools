/**
 * @module modules/pitbot/commands/timeoutns
 */
import * as Pits from '../pitManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let mods = await getModeratorIds.call(this, true);
  if (!mods.includes(interaction.user.id)) {
    await interaction.reply({ephemeral:true, content:"You don't have permission to do that."});
    return;
  }
  
  let user = interaction.options.getUser('user');
  let hours = interaction.options.getInteger('duration');
  let comment = interaction.options.getString('comment');
  await Pits.pit.call(this, user, hours*(this.master.config.id === '1040775664539807804' ? 1000 : 3600000), interaction.user, comment);
  if(!interaction.replied)
    await interaction.reply({ephemeral:true,content:'Check log channel for confirmation.'});
}

export const definition = {
  "name": "timeoutns",
  "description": "Timeout a user without issuing a strike.",
  "options": [
    {
      "name": "user",
      "description": "The user to timeout.",
      "type": 6,
      "required": true,
    },
    {
      "name": "duration",
      "description": "Duration of the timeout in hours.",
      "type": 4,
      "required": true,
      "min_value": 1,
    },
    {
      "name": "comment",
      "description": "Reason for the timeout.",
      "type": 3,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
