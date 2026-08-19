import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../../types/index.js';
import { TicketService } from '../../services/ticket/TicketService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Spawn a ticket panel in the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title for the ticket panel embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description for the ticket panel embed')
        .setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId || !interaction.channel) return;

    const title = interaction.options.getString('title') || 'Need Support?';
    const description = interaction.options.getString('description') || 'To create a ticket use the Create ticket button';

    await interaction.deferReply({ ephemeral: true });

    try {
      await TicketService.createPanel(
        interaction.guildId,
        interaction.channel as TextChannel,
        title,
        description
      );

      await interaction.followUp({ content: '✅ Ticket panel successfully spawned!', ephemeral: true });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, 'Failed to spawn ticket panel');
      await interaction.followUp({ content: '❌ Failed to spawn the ticket panel.', ephemeral: true });
    }
  },
};

export default command;
