import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { AchievementService } from '../../services/economy/AchievementService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn some coins.'),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const { reward, newBalance, updatedProfile } = await EconomyService.work(interaction.guildId, interaction.user.id);
      await interaction.reply(`💼 You completed your work and earned **${reward} coins**! Your new balance is **${newBalance} coins**.`);

      AchievementService.checkEconomyAchievements(updatedProfile, interaction.channel as any).catch(err => {
        logger.error({ err, guildId: interaction.guildId, userId: interaction.user.id }, 'Failed to check economy achievements for work');
      });
    } catch (error: any) {
      if (error.message && error.message.includes('On cooldown')) {
        const remainingMs = parseInt(error.message.split(': ')[1], 10);
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        await interaction.reply({ content: `⏳ You are tired from working. Please wait **${minutes}m ${seconds}s** before working again.`, ephemeral: true });
      } else {
        logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /work command');
        await interaction.reply({ content: 'Failed to complete work.', ephemeral: true });
      }
    }
  },
};

export default command;
