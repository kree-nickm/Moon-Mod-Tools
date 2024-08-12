# Moon-Mod-Tools

## Installation
1. Checkout this repository onto your server.
2. Obtain or create a [configuration file](#configuration-file) with the bot's ID and token, among other settings described below.
3. Run `npm install` to install all of the dependencies.
4. Start the bot with `node .` to use default options.
   * If the configuration file is not `config.json`, you can instead run `node . --config <filename>` to load your configuration file.

## Configuration File
Configuration file format:
```json
{
  "id": "1234567890",
  "token": "abc123-abc123-abc123-abc123",
  "intents": ["Guilds", "GuildMessages", "MessageContent", "DirectMessages"],
  "partials": ["Channel", "Message"],
  "slashCommands": [
    {
      "filename": "events/command.mjs",
      "guildIds": []
    }
  ]
}
```
* **id / token** - These come from the [Discord Developer portal](https://discord.com/developers/applications) for your bot. **id** is the Application ID from the General Information page. **token** comes from the Bot page (but can only be viewed once, so don't miss it).
* **intents** - Array of strings, each being a member of [GatewayIntentBits](https://discord-api-types.dev/api/discord-api-types-v10/enum/GatewayIntentBits).
* **partials** - Array of strings, each being a member of [Partials](https://discordjs.guide/popular-topics/partials.html#enabling-partials).
* **slashCommands** - Array of objects, each a definition of a slash command. Those definitions have the following properties:
  * **filename** - File that contains the code for this slash command.
  * **guildIds** - Array of guild IDs where this command will be available. Do not include this property for global commands.