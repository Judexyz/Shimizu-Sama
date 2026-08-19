import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Configure the ticket system for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('category')
        .setDescription('The category where new tickets will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName('support_role')
        .setDescription('The role that will be pinged and given access to tickets')
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('transcript_channel')
        .setDescription('The channel where ticket transcripts will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) return;

    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support_role');
    const transcriptChannel = interaction.options.getChannel('transcript_channel');

    try {
      await prisma.ticketSettings.upsert({
        where: { guildId: interaction.guildId },
        update: {
          ...(category && { categoryId: category.id }),
          ...(supportRole && { supportRoleId: supportRole.id }),
          ...(transcriptChannel && { transcriptChannelId: transcriptChannel.id }),
        },
        create: {
          guildId: interaction.guildId,
          ...(category && { categoryId: category.id }),
          ...(supportRole && { supportRoleId: supportRole.id }),
          ...(transcriptChannel && { transcriptChannelId: transcriptChannel.id }),
        },
      });

      await interaction.reply({
        content: '✅ Ticket settings have been updated successfully!',
        ephemeral: true,
      });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, 'Failed to configure ticket settings');
      await interaction.reply({
        content: '❌ An error occurred while saving the ticket settings.',
        ephemeral: true,
      });
    }
  },
};

export default command;
