/**
 * @module modules/pitbot/commands/warns
 */
import * as Warns from '../warnManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let user;
  let mod;
  let mods = await getModeratorIds.call(this, true);
  if (mods.includes(interaction.user.id)) {
    user = interaction.options.getUser('user') ?? interaction.user;
    mod = interaction.user;
  }
  else
    user = interaction.user;
  await Warns.list.call(this, user, mod, {interaction});
}

export const definition = {
  "name": "warns",
  "description": "List a user's warnings.",
  "options": [
    {
      "name": "user",
      "description": "(Mods only) The user to fetch. Fetches your own if blank or you're not a mod.",
      "type": 6,
    },
  ],
};
