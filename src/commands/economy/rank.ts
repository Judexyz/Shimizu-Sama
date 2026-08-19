import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { LevelingService } from '../../services/economy/LevelingService.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check your or another user's current level and XP.")
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
      const profile = await EconomyService.getProfile(interaction.guildId, targetUser.id);

      const currentLevel = profile.level;
      const currentXp = profile.xp;
      const nextLevelXp = LevelingService.requiredTotalXp(currentLevel + 1);
      const prevLevelXp = LevelingService.requiredTotalXp(currentLevel);

      const xpInCurrentLevel = currentXp - prevLevelXp;
      const xpNeededForNextLevel = nextLevelXp - prevLevelXp;
      const progressPercent = Math.min(
        100,
        Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100))
      );

      const barLength = 20;
      const filledLength = Math.floor((progressPercent / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

      await interaction.reply({
        content: `📈 **${targetUser.username}'s Rank**\n\n**Level:** ${currentLevel}\n**XP:** ${currentXp} / ${nextLevelXp}\n\n**Progress:** [${progressBar}] ${progressPercent}%`,
      });
    } catch (error) {
      logger.error(
        { error, guildId: interaction.guildId, userId: interaction.user.id },
        'Error in /rank command'
      );
      await interaction.reply({ content: 'Failed to retrieve rank.', ephemeral: true });
    }
  },
};

export default command;
