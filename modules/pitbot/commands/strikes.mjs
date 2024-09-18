/**
 * @module modules/pitbot/commands/strikes
 */
import * as Strikes from '../strikeManager.mjs';
import { getModeratorIds } from '../roles.mjs';

export async function handler(interaction) {
  let user;
  let fromMod = false;
  let mods = await getModeratorIds.call(this, true);
  if (mods.includes(interaction.user.id)) {
    user = interaction.options.getUser('user') ?? interaction.user;
    fromMod = true;
  }
  else
    user = interaction.user;
  await Strikes.list.call(this, user, fromMod, {interaction});
}

export const definition = {
  "name": "strikes",
  "description": "List a user's strikes.",
  "options": [
    {
      "name": "user",
      "description": "(Mods only) The user to fetch. Fetches your own if blank or you're not a mod.",
      "type": 6,
    },
  ],
};
