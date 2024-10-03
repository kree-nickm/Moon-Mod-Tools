/**
 * @module modules/pitbot/commands/editcomment
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
  let comment = interaction.options.getString('comment');
  await Strikes.comment.call(this, strikeId, comment, {interaction});
  if(!interaction.replied)
    await interaction.reply({ephemeral:true, content:'Check log channel for confirmation.'});
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
