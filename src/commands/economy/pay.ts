import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { AchievementService } from '../../services/economy/AchievementService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay coins to another user.')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to pay')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The amount of coins to pay')
        .setRequired(true)
        .setMinValue(1)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (targetUser.bot) {
      await interaction.reply({ content: 'You cannot pay a bot.', ephemeral: true });
      return;
    }

    try {
      const { updatedSender, updatedRecipient } = await EconomyService.transfer(interaction.guildId, interaction.user.id, targetUser.id, amount);
      await interaction.reply(`💸 You paid **${amount} coins** to **${targetUser.username}**!`);

      // Check achievements for sender
      AchievementService.checkEconomyAchievements(updatedSender, interaction.channel as any).catch(err => {
        logger.error({ err, guildId: interaction.guildId, userId: interaction.user.id }, 'Failed to check achievements for sender');
      });

      // Check achievements for recipient
      AchievementService.checkEconomyAchievements(updatedRecipient, interaction.channel as any).catch(err => {
        logger.error({ err, guildId: interaction.guildId, userId: targetUser.id }, 'Failed to check achievements for recipient');
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Insufficient funds')) {
        await interaction.reply({ content: 'You do not have enough coins to make this payment.', ephemeral: true });
      } else if (error.message && error.message.includes('yourself')) {
        await interaction.reply({ content: 'You cannot pay yourself.', ephemeral: true });
      } else {
        logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /pay command');
        await interaction.reply({ content: 'Failed to process payment.', ephemeral: true });
      }
    }
  },
};

export default command;
