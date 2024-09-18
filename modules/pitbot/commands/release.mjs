/**
 * @module modules/pitbot/commands/release
 */
import * as Strikes from '../strikeManager.mjs';

export async function handler(interaction) {
  let user = interaction.options.getUser('user');
  let amend = interaction.options.getBoolean('amend');
  await Strikes.release.call(this, user, interaction.user, amend, interaction);
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
