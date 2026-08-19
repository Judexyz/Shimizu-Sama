import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { AchievementService } from '../../services/economy/AchievementService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins.'),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const { reward, newBalance, updatedProfile } = await EconomyService.claimDaily(interaction.guildId, interaction.user.id);
      await interaction.reply({ content: `✅ You claimed your daily reward of **${reward} coins**!\nYour new balance is **${newBalance} coins**.`, flags: MessageFlags.Ephemeral });

      AchievementService.checkEconomyAchievements(updatedProfile, interaction.channel as any).catch(err => {
        logger.error({ err, guildId: interaction.guildId, userId: interaction.user.id }, 'Failed to check economy achievements for daily');
      });
    } catch (error: any) {
      if (error.message && error.message.includes('On cooldown')) {
        const remainingMs = parseInt(error.message.split(': ')[1], 10);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        await interaction.reply({ content: `⏳ You already claimed your daily reward. Please wait **${hours}h ${minutes}m** before claiming again.`, ephemeral: true });
      } else {
        logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /daily command');
        await interaction.reply({ content: 'Failed to claim daily reward.', ephemeral: true });
      }
    }
  },
};

export default command;
