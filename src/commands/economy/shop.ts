import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the items available in the shop.'),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    try {
      const items = await prisma.shopItem.findMany({
        where: { guildId: interaction.guildId },
        orderBy: { price: 'asc' },
      });

      if (items.length === 0) {
        await interaction.reply({ content: 'The shop is currently empty.', ephemeral: true });
        return;
      }

      let shopStr = `🛒 **Server Shop**\n\n`;
      for (const item of items) {
        shopStr += `**${item.name}** - 🪙 ${item.price} coins\n`;
        if (item.description) shopStr += `*${item.description}*\n`;
        shopStr += `\n`;
      }

      await interaction.reply({ content: shopStr });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, 'Error in /shop command');
      await interaction.reply({ content: 'Failed to retrieve shop items.', ephemeral: true });
    }
  },
};

export default command;
