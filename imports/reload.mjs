/**
 * Reloads the code for an event, application command, or whole module. If you use this, make sure it's an owner-only command.
 * @module imports/reload
 */

export async function handler(interaction) {
  let type = interaction.options.getSubcommand();
  if (type === 'module') {
    let moduleName = interaction.options.getString('module');
    let module = this.master.modules[moduleName];
    await interaction.deferReply({ephemeral:true});
    if (module) {
      try {
        await module.reload();
        // TODO: Check if dirty.
        await this.master.listenerManager.sendApplicationCommands();
        await interaction.followUp({content:`Reloaded module '${moduleName}'.`});
      }
      catch(err) {
        this.master.logWarn(`Failed to reload module '${moduleName}'.`, err);
        await interaction.followUp({content:`Failed to reload module '${moduleName}'.`});
      }
    }
    else {
      this.master.logWarn(`Invalid module for reload '${moduleName}'.`);
      await interaction.followUp({content:`Invalid module '${moduleName}'.`});
    }
  }
};

export const definition = {
  name: 'reload',
  description: 'Reload a module. Only the bot owner can use this.',
  options: [
    {
      type: 1,
      name: 'module',
      description: 'Reload a module. Only the bot owner can use this.',
      options: [
        {
          name: "module",
          description: "Name of the module.",
          type: 3,
          required: true,
        },
      ],
    },
  ],
};
