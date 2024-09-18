/**
 * @module modules/pitbot/commands/strikes
 */
import * as Strikes from '../strikeManager.mjs';

export async function handler(interaction) {
  let user = interaction.options.getUser('user');
  await Strikes.list.call(this, user, interaction);
}

export const definition = {
  "name": "strikes",
  "description": "List a user's strikes.",
  "options": [
    {
      "name": "user",
      "description": "The user fetch.",
      "type": 6,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
