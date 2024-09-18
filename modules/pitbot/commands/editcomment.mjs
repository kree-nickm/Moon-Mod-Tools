/**
 * @module modules/pitbot/commands/editcomment
 */
import * as Strikes from '../strikeManager.mjs';

export async function handler(interaction) {
  let strikeId = interaction.options.getInteger('strike');
  let comment = interaction.options.getString('comment');
  await Strikes.comment.call(this, strikeId, comment, interaction);
}

export const definition = {
  "name": "editcomment",
  "description": "Edit the comment of a strike.",
  "options": [
    {
      "name": "strike",
      "description": "The ID of the strike to edit. Use /strikes to find the ID.",
      "type": 4,
      "required": true,
      "min_value": 1,
    },
    {
      "name": "comment",
      "description": "New reason for the strike.",
      "type": 3,
      "required": true,
    },
  ],
  "default_member_permissions": String(1 << 28), // MANAGE_ROLES
};
