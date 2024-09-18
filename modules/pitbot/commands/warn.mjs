/**
 * @module modules/pitbot/commands/warn
 */
import * as Warns from '../warnManager.mjs';

export async function handler(interaction) {
  let user = interaction.options.getUser('user');
  let comment = interaction.options.getString('comment');
  await Warns.add.call(this, user, interaction.user, comment, interaction);
}

export const definition = {
  "name": "warn",
  "description": "Issue a warning to a user.",
  "options": [
    {
      "name": "user",
      "description": "The user to warn.",
      "type": 6,
      "required": true,
    },
    {
      "name": "comment",
      "description": "Reason for the warning.",
      "type": 3,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
