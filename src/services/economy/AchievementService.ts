import { Message, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { Achievement, achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';

export class AchievementService {
  private static async notifyUnlock(
    guildId: string,
    userId: string,
    achievement: Achievement,
    fallbackChannelId?: string
  ) {
    try {
      const cacheKey = `guild:settings:${guildId}`;
      let settings = await CacheService.get<any>(cacheKey);

      if (!settings) {
        settings = await prisma.guildSettings.findUnique({ where: { guildId } });
        if (settings) await CacheService.set(cacheKey, settings, 300);
      }

      let targetChannelId = settings?.levelUpChannelId || fallbackChannelId;
      if (!targetChannelId) return;
    } catch (error) {
      logger.error({ error, guildId, userId }, 'Failed to send achievement notification');
    }
  }

  private static async notifyUnlockWithChannel(
    guildId: string,
    userId: string,
    achievement: Achievement,
    fallbackChannel?: TextChannel
  ) {
    try {
      const cacheKey = `guild:settings:${guildId}`;
      let settings = await CacheService.get<any>(cacheKey);

      if (!settings) {
        settings = await prisma.guildSettings.findUnique({ where: { guildId } });
        if (settings) await CacheService.set(cacheKey, settings, 300);
      }

      let channelToSend: TextChannel | undefined = fallbackChannel;

      if (settings?.levelUpChannelId && fallbackChannel?.guild) {
        const customChannel = fallbackChannel.guild.channels.cache.get(settings.levelUpChannelId);
        if (customChannel && customChannel.isTextBased()) {
          channelToSend = customChannel as TextChannel;
        }
      }

      if (!channelToSend) return;

      const messageContent = `🏆 **Achievement Unlocked: ${achievement.name}**\n<@${userId}> ${achievement.description}`;
      await channelToSend.send(messageContent);
    } catch (error) {
      logger.error(
        { error, guildId, userId, achievementKey: achievement.key },
        'Failed to send achievement notification'
      );
    }
  }

  private static async checkAndUnlock(
    profileId: string,
    guildId: string,
    userId: string,
    achievementsToCheck: Achievement[],
    fallbackChannel?: TextChannel
  ) {
    try {
      const unlockedRecords = await prisma.userAchievement.findMany({
        where: { profileId },
        select: { achievementKey: true },
      });
      const unlockedKeys = new Set(unlockedRecords.map((r) => r.achievementKey));

      for (const achievement of achievementsToCheck) {
        if (!unlockedKeys.has(achievement.key)) {
          try {
            await prisma.userAchievement.create({
              data: {
                profileId,
                achievementKey: achievement.key,
              },
            });

            await this.notifyUnlockWithChannel(guildId, userId, achievement, fallbackChannel);
          } catch (createError: any) {
            if (createError.code !== 'P2002') {
              throw createError;
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error, guildId, userId }, 'Error checking achievements');
    }
  }

  public static async checkMessagingAchievements(profile: any, fallbackChannel?: TextChannel) {
    const relevantAchievements = achievementsRegistry.filter(
      (a) => a.type === 'MESSAGING' && profile.messagesSent >= a.threshold
    );
    if (relevantAchievements.length > 0) {
      await this.checkAndUnlock(
        profile.id,
        profile.guildId,
        profile.userId,
        relevantAchievements,
        fallbackChannel
      );
    }
  }

  public static async checkLevelingAchievements(profile: any, fallbackChannel?: TextChannel) {
    const relevantAchievements = achievementsRegistry.filter(
      (a) => a.type === 'LEVELING' && profile.level >= a.threshold
    );
    if (relevantAchievements.length > 0) {
      await this.checkAndUnlock(
        profile.id,
        profile.guildId,
        profile.userId,
        relevantAchievements,
        fallbackChannel
      );
    }
  }

  public static async checkEconomyAchievements(profile: any, fallbackChannel?: TextChannel) {
    const relevantAchievements = achievementsRegistry.filter((a) => {
      if (a.type !== 'ECONOMY') return false;

      switch (a.key) {
        case 'first_daily':
          return profile.dailyClaims >= a.threshold;
        case 'first_work':
        case 'hard_worker':
          return profile.workCompletions >= a.threshold;
        case 'first_payment':
          return profile.paymentsSent >= a.threshold;
        case 'first_purchase':
          return profile.shopPurchases >= a.threshold;
        case 'coins_10000':
        case 'millionaire':
        case 'entrepreneur':
          return profile.totalCoinsEarned >= a.threshold;
        default:
          return false;
      }
    });

    if (relevantAchievements.length > 0) {
      await this.checkAndUnlock(
        profile.id,
        profile.guildId,
        profile.userId,
        relevantAchievements,
        fallbackChannel
      );
    }
  }

  public static getUserAchievements(unlockedKeys: string[]) {
    return achievementsRegistry.filter((a) => unlockedKeys.includes(a.key));
  }
}
