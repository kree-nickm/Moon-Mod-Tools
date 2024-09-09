/**
 * @module modules/pitbot/commands/strike
 */
import * as Strikes from '../strikes.mjs';

export async function handler(interaction) {
  let user = interaction.options.getUser('user');
  let severity = interaction.options.getInteger('severity');
  let comment = interaction.options.getString('comment');
  await Strikes.add.call(this, user, interaction.user, severity, comment, interaction);
}

export const definition = {
  "name": "strike",
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
