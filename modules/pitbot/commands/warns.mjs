/**
 * @module modules/pitbot/commands/warns
 */
import * as Warns from '../warnManager.mjs';

export async function handler(interaction) {
  let user = interaction.options.getUser('user');
  await Warns.list.call(this, user, interaction);
}

export const definition = {
  "name": "warns",
  "description": "List a user's warnings.",
  "options": [
    {
      "name": "user",
      "description": "The user whose warnings to fetch.",
      "type": 6,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
