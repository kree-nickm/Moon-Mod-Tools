# Moon Mod Tools
Code base for all of the bots that provide moderator tools in moonmoon's subscriber Discord.

## Installation
1. Checkout this repository onto your server.
2. Obtain or create a [configuration file](#configuration-file) with the bot's ID and token, among other settings described below.
3. Run `npm install` to install all of the dependencies.
4. Start the bot with `node .` to use default options.
   * If your configuration file is not `config.json` in the app directory, you can instead run `node . --config <filename>` to load your configuration file.

## Configuration File
Example configuration file:
```json
{
  "id": "1234567890",
  "token": "abc123-abc123-abc123-abc123",
  "intents": ["Guilds"],
  "partials": ["Channel"],
  "applicationCommands": [
    {
      "filename": "events/shutdown.mjs",
      "guildIds": [],
      "owner": true
    }
  ],
  "modules": [
    {
      "name": "logger",
      "options": {
        "logChannelId": "1272732359665647688"
      }
    }
  ],
  "ownerId": "12345678901234567890"
}
```
* **id / token** - *(Both required)* These come from the [Discord developer portal](https://discord.com/developers/applications) for your bot. **id** is the Application ID from the General Information page. **token** comes from the Bot page (but can only be viewed once, so don't miss it).
* **intents** - Array of strings, each being a member of [GatewayIntentBits](https://discord-api-types.dev/api/discord-api-types-v10/enum/GatewayIntentBits).
* **partials** - Array of strings, each being a member of [Partials](https://discordjs.guide/popular-topics/partials.html#enabling-partials).
* **applicationCommands** - Array of objects, each a definition of an application command. Application command definitions have the following properties:
  * **filename** - File that contains the [properties of the application command](#application-command-file).
  * **guildIds** - Array of guild IDs where this command will be available. Do not include this property for global commands.
  * **owner** - True or false, whether this command can only be used by the bot owner.
* **modules** - Array of module definitions to specify which installed modules should be loaded for this bot. Module definitions have the following properties:
  * **name** - Name of the module, which matches the folder containing the module's code.
  * **options** - An object with module-specific configuration options. Different modules will want different properties here.
* **ownerId** - Discord ID of the user who owns the bot. This user will have access to all bot features, and that access cannot be removed.

## Application Command File
Example application command file:
```javascript
/**
 * The function to run when the associated application command is used.
 * @param {CommandInteraction} interaction - The interaction object created by
 * Discord.js for this application command.
 */
export function handler(interaction) {
  interaction.reply({content:`I see you.`, ephemeral:true});
};

/**
 * The definition for the application command, which will be sent to the Discord
 * API.
 * @type {Object.<string, *>}
 */
export const definition = {
  "name": "test",
  "description": "Doesn't do much.",
};
```
Application command files must export two values:
* A Function as `handler`, which is the function to run when [the command is used](https://discord.js.org/docs/packages/discord.js/main/Client:Class#interactionCreate). The interaction object documentation can be found at one of the following, depending on the type of interaction:
  * [Slash command](https://discord.js.org/docs/packages/discord.js/main/ChatInputCommandInteraction:Class)
  * [Message context menu](https://discord.js.org/docs/packages/discord.js/main/MessageContextMenuCommandInteraction:Class)
  * [User context menu](https://discord.js.org/docs/packages/discord.js/main/UserContextMenuCommandInteraction:Class)
* An Object as `definition`, which is the application command definition. Documentation for this definition can be found at the following links:
  * [Global commands](https://discord.com/developers/docs/interactions/application-commands#create-global-application-command-json-params)
  * [Guild-specific commands](https://discord.com/developers/docs/interactions/application-commands#create-guild-application-command-json-params).

## Modules
A module is a set of features with a common purpose. Each module should be contained within its own directory inside of the `modules/` directory. Inside of the module's directory, a file named `index.mjs` must be present, which will be imported when the module is loaded. An example module index file:
```javascript
/**
 * Array of strings, specifying the intents that this module requires. See the
 * intents description in the configuration file section for more info.
 */
export const intents = [];

/**
 * Array of strings, specifying the partials that this module requires. See the
 * partials description in the configuration file section for more info.
 */
export const partials = [];

/**
 * Function that is called during bot startup, before the bot has logged in.
 * Use it to assign event listeners or other definitions that do not require an
 * active connection to Discord. This function can be async, in which case the
 * bot startup will await it.
 * @this Bot
 * @param {Object} module - The stored data of the loaded module.
 */
export function onStart(module) {
  // Code.
};

/**
 * Function that is called after the bot is logged in and ready. This function
 * can be async, in which case the bot startup will await it.
 * @this Bot
 * @param {Object} module - The stored data of the loaded module.
 */
export function onReady(module) {
  // Code.
};
```
Modules included with this bot are below:

### logger
Logs the updating or deleting of messages on a server. Retains any attachments that are deleted with the message as well.
Options:
* **logChannelId** - The snowflake ID of the channel where messages are to be logged.

### modmail
Allows users to send reports to the moderation team as a whole, and allows the moderation team to discuss their reports and anonymously interact with the user.
Options:
* **mailChannelId** - The snowflake ID of the channel where modmail report threads will be created for mods to discuss the report. Must be a forum channel.
* **databaseFile** - Filename of the SQLite database file within the `storage/` directory that stores users and their modmail tickets, to make looking them up easier. Default: `modmail.sqlite`

## Documentation
The documentation in the `docs` directory is generated with [JSDoc](https://jsdoc.app) with the following configuration file:
```javascript
'use strict';

// BigInt JSON serialization.
BigInt.prototype.toJSON = function() {
  return this.toString() + 'n';
}

module.exports = {
  "plugins": ["plugins/markdown"],
  "opts": {
    "template": "docs/template",
    "destination": "docs",
    "recurse": true,
    "readme": "README.md",
    "package": "package.json",
  },
  "source": {
    "includePattern": "\\.m?js$",
    "exclude": ["docs", "node_modules", ".git"],
  },
  "templates": {
    "default": {
      "outputSourceFiles": false,
    },
  },
};
```
If you add code to the bot and want your changes to be documented in the same manner, use this information to do so.