/**
 * @module modules/pitbot/commands/release
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
  let amend = interaction.options.getBoolean('amend');
  await Strikes.release.call(this, user, interaction.user, amend);
  if(!interaction.replied)
    await interaction.reply({ephemeral:true,content:'Check log channel for confirmation.'});
}

export const definition = {
  "name": "release",
  "description": "Release a user from the pit, optionally deleting their most recent strike.",
  "options": [
    {
      "name": "user",
      "description": "The user to release.",
      "type": 6,
      "required": true,
    },
    {
      "name": "amend",
      "description": "Put 'True' here to remove their most recent strike.",
      "type": 5,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
