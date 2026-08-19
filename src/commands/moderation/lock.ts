import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Command } from '../../types/index.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Locks the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (
      !interaction.inCachedGuild() ||
      !interaction.channel ||
      !(interaction.channel instanceof TextChannel)
    ) {
      await interaction.reply({
        content: 'This command can only be used in a text channel.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.id,
        {
          SendMessages: false,
        },
        { reason: `Channel locked by ${interaction.user.tag}` }
      );

      await interaction.reply(`🔒 Channel has been locked.`);
    } catch {
      await interaction.reply({
        content: `❌ Failed to lock the channel. Please check my permissions.`,
        ephemeral: true,
      });
    }
  },
};

export default command;
