# Moon-Mod-Tools

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
  "slashCommands": [
    {
      "filename": "events/shutdown.mjs",
      "guildIds": [],
      "owner": true,
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
* **slashCommands** - Array of objects, each a definition of a slash command. Slash command definitions have the following properties:
  * **filename** - File that contains the [properties of the slash command](#slash-command-file).
  * **guildIds** - Array of guild IDs where this command will be available. Do not include this property for global commands.
  * **owner** - True or false, whether this command can only be used by the bot owner.
* **modules** - Array of module definitions to specify which installed modules should be loaded for this bot. Module definitions have the following properties:
  * **name** - Name of the module, which matches the folder containing the module's code.
  * **options** - An object with module-specific configuration options. Different modules will want different properties here.
* **ownerId** - Discord ID of the user who owns the bot. This user will have access to all bot features, and that access cannot be removed.

## Slash Command File
Example slash command file:
```javascript
/**
 * The function to run when the associated slash command is used.
 * @param ChatInputCommandInteraction interaction - The interaction object created by Discord.js for this slash command.
 */
export function handler(interaction) {
  interaction.reply({content:`I see you.`, ephemeral:true});
};

/**
 * The definition for the slash command, which will be sent to the Discord API.
 * @type Object.<string, *>
 */
export const definition = {
  "name": "test",
  "description": "Doesn't do much.",
};
```
Slash command files must export two values:
* A Function as `handler`, which is the function to run when [the command is used](https://discord.js.org/docs/packages/discord.js/main/Client:Class#interactionCreate). See [here](https://discord.js.org/docs/packages/discord.js/main/ChatInputCommandInteraction:Class) for the documentation of the interaction object.
* An Object as `definition`, which is the slash command definition as described here: [global commands](https://discord.com/developers/docs/interactions/application-commands#create-global-application-command-json-params), [guild-specific commands](https://discord.com/developers/docs/interactions/application-commands#create-guild-application-command-json-params).

## Modules
A module is a set of features with a common purpose. Each module should be contained within its own directory inside of the `modules/` directory. Inside of the module's directory, a file named `index.mjs` must be present, which will be imported when the module is loaded. An example module index file:
```javascript
/**
 * Function that is called during bot startup, before the bot has logged in. Use it to assign event listeners or other definitions that do not require an active connection to Discord. This function can be async, in which case the bot startup will await it.
 * @param Bot bot - Reference to the Bot.
 * @param Object.<string, *> options - The options defined in the configuration file for this module.
 */
export function initialize(bot, options) {
  // Code.
};
```
Modules included with this bot are below:
### logger
Logs the updating or deleting of messages on a server. Retains any attachments that are deleted with the message as well.
Options:
* **logChannelId** - The snowflake ID of the channel where messages are to be logged.