import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ServerStatsService } from '../../services/serverStats/ServerStatsService.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Manage the server stats display channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName('setup').setDescription('Creates the server stats channels')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('update').setDescription('Force update the server stats immediately')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('remove').setDescription('Removes the server stats channels')
    ) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) return;
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    if (subcommand === 'setup') {
      const success = await ServerStatsService.setup(interaction.guild);
      if (success) {
        await interaction.editReply(
          '✅ Server stats channels have been successfully created! They will update automatically every 10 minutes.'
        );
      } else {
        await interaction.editReply(
          '❌ Failed to setup server stats. Please check my permissions.'
        );
      }
    } else if (subcommand === 'update') {
      await ServerStatsService.updateGuildStats(interaction.guild);
      await interaction.editReply('✅ Server stats have been successfully synced!');
    } else if (subcommand === 'remove') {
      const success = await ServerStatsService.remove(interaction.guild);
      if (success) {
        await interaction.editReply('✅ Server stats channels have been successfully removed.');
      } else {
        await interaction.editReply(
          '❌ Failed to remove server stats. Are you sure they are setup?'
        );
      }
    }
  },
};

export default command;
