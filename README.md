# Moon Mod Tools
Code base for all of the bots that provide moderator tools in moonmoon's subscriber Discord.

## Installation
1. Checkout this repository onto your server.
2. Obtain or create a [configuration file](#configuration-file) with the bot's ID and token, among other settings described below.
3. Run `npm install` to install all of the dependencies.

## Running the Bot
Start the bot with `node .` to use default options.
* If your configuration file is not `config.json` in the app directory, you can instead run `node . --config <filename>` to load your configuration file.

To use PM2, you instead run `pm2 start --name="<bot name>" "node ."` or `pm2 start --name="<bot name>" node -- .`
* You can either enclose the node command and arguments in quotes, or add all node arguments after `node --`, as above.
* Including a bot name is strongly recommended, otherwise PM2 will simply list the bot as "node" which may be confusing, especially in the log files.

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
        "msgLogChannelId": "1272732359665647688"
      }
    }
  ],
  "ownerId": "12345678901234567890"
}
```
* **id / token** - *(Both required)* These come from the [Discord developer portal](https://discord.com/developers/applications) for your bot. **id** is the Application ID from the General Information page. **token** comes from the Bot page (but can only be viewed once, so don't miss it).
* **intents** - Array of strings, each being a member of [GatewayIntentBits](https://discord-api-types.dev/api/discord-api-types-v10/enum/GatewayIntentBits).
* **partials** - Array of strings, each being a member of [Partials](https://discordjs.guide/popular-topics/partials.html#enabling-partials).
  * *Note:* Modules can add intents and partials as well from their `index.mjs` files, in which case you don't need to add them here yourself.
* **applicationCommands** - Array of objects, each a definition of an application command. Application command definitions have the following properties:
  * **filename** - File that contains the [properties of the application command](#application-command-file).
  * **guildIds** - Array of guild IDs where this command will be available. Do not include this property for global commands.
  * **owner** - True or false, whether this command can only be used by the bot owner.
* **modules** - Array of module definitions to specify which installed modules should be loaded for this bot. Module definitions have the following properties:
  * **name** - Name of the module, which matches the folder containing the module's code.
  * **options** - An object with module-specific configuration options. Different modules will want different properties here.
* **ownerId** - Discord ID of the user who owns the bot. Ideally, the owner will be granted access to all bot features, though this may not be possible for restricted application commands.

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

Note that there are other ways to add application commands; this method is to make it easier to add them via the configuration file.

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
 * @throws If there is a problem starting the module, you can throw an
 * exception to cancel the loading of the module. This will not cancel the
 * loading of the bot.
 * @param {Object} module - The stored data of the loaded module.
 */
export function onStart(module) {
  // Code.
};

/**
 * Function that is called after the bot is logged in and ready. This function
 * can be async, in which case the bot startup will await it.
 * @this Bot
 * @throws If there is a problem readying the module, you can throw an
 * exception to cancel the loading of the module. This will not cancel the
 * loading of the bot.
 * @param {Object} module - The stored data of the loaded module.
 */
export function onReady(module) {
  // Code.
};
```
Modules included with this bot are below:

### logger
If `msgLogChannelId` option is provided, the bot logs the updating or deleting of messages to that channel for that server. Retains any attachments that are deleted with the message as well. Note that Discord does not allow you to fetch the original message once it has been updated or deleted, so the only messages that can be reported are those that have been cached in the bot's memory. The bot will try to cache as many messages as it can upon startup, but there will be a limit.

If `joinLogChannelId` option is provided, the bot logs information about users who join and leave the server. If the bot has appropriate permissions, it will also log when invites are created and used.

Requirements:
* **Message Content Intent** for the bot in the [Discord Dev Portal](https://discord.com/developers/applications).
* **Server Members Intent** for the bot in the [Discord Dev Portal](https://discord.com/developers/applications).
* *(Optional)* **Manage Server** general server permission. Needed in order to track invites. Without it, invites won't be tracked.
* *(Optional)* **Manage Channels** general server permission. Needed in order to track invites. Without it, invites won't be tracked.

Configuration Options (at least one must be provided):
* **msgLogChannelId** - The snowflake ID of the channel where messages are to be logged.
* **joinLogChannelId** - The snowflake ID of the channel where member joins and removals are to be logged.

### modmail
Allows users to send reports to the moderation team as a whole, and allows the moderation team to discuss their reports and interact with the user.

Configuration Options:
* **mailChannelId** - The snowflake ID of the channel where modmail report threads will be created for mods to discuss the report. Must be a forum channel.
* **lockTagId** - The snowflake ID of a thread tag that the bot will check for. If a ticket thread as this tag, it will be treated as 'locked', even if it's not. Omit if you have no such tag.
* **databaseFile** - Filename of the SQLite database file within the `storage/` directory that stores users and their modmail tickets, to make looking them up easier. Default: `modmail.sqlite`

### pitbot
Manages the role that marks users as suspended, and logs disciplinary actions to allow moderators to better manage punishments against users who break the server rules.

Configuration Options:
* **logChannelId** - The snowflake ID of the channel where pitbot will report all disciplinary actions that it takes.
* **pitRoleId** - The snowflake ID of the role to give to users who are currently suspended.
* **modRoleId** - A string or array of strings. Each string is a snowflake ID of a moderator role, so the bot knows who the moderators are.
* **databaseFile** - Filename of the SQLite database file within the `storage/` directory that stores all current and past disciplinary actions. Default: `pitbot.sqlite`

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
