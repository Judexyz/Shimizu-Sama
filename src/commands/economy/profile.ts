import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { LevelingService } from '../../services/economy/LevelingService.js';
import { prisma } from '../../database/prisma.js';
import { achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile, statistics, and achievements.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose profile you want to view')
        .setRequired(false)
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

      const unlockedCount = await prisma.userAchievement.count({
        where: { profileId: profile.id },
      });
      const totalAchievements = achievementsRegistry.length;

      const nextLevelXp = LevelingService.requiredTotalXp(profile.level + 1);
      const prevLevelXp = LevelingService.requiredTotalXp(profile.level);

      const currentLevelProgress = profile.xp - prevLevelXp;
      const xpNeededForLevel = nextLevelXp - prevLevelXp;
      const percent = Math.min(100, Math.max(0, (currentLevelProgress / xpNeededForLevel) * 100));

      const barLength = 15;
      const filledBlocks = Math.round((percent / 100) * barLength);
      const emptyBlocks = barLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor('#5865F2')
        .addFields(
          {
            name: '📈 Leveling',
            value: `**Level:** ${profile.level}\n**XP:** ${profile.xp} / ${nextLevelXp}\n\`${progressBar}\` ${Math.round(percent)}%`,
            inline: true,
          },
          {
            name: '💰 Economy',
            value: `**Balance:** ${profile.balance} coins\n**Total Earned:** ${profile.totalCoinsEarned} coins`,
            inline: true,
          },
          {
            name: '🏆 Achievements',
            value: `**Unlocked:** ${unlockedCount} / ${totalAchievements}`,
            inline: false,
          },
          {
            name: '📊 Statistics',
            value: [
              `**Messages Sent:** ${profile.messagesSent}`,
              `**Daily Claims:** ${profile.dailyClaims}`,
              `**Work Completions:** ${profile.workCompletions}`,
              `**Shop Purchases:** ${profile.shopPurchases}`,
              `**Payments Sent:** ${profile.paymentsSent}`,
              `**Payments Received:** ${profile.paymentsReceived}`,
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: `Member since • ${profile.createdAt.toLocaleDateString()}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(
        { error, guildId: interaction.guildId, userId: targetUser.id },
        'Error in /profile command'
      );
      await interaction.reply({ content: 'Failed to retrieve profile.', ephemeral: true });
    }
  },
};

export default command;
