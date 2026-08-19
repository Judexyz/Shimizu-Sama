import { Message, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { Achievement, achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';

export class AchievementService {
  /**
   * Helper to send achievement unlock notification.
   */
  private static async notifyUnlock(guildId: string, userId: string, achievement: Achievement, fallbackChannelId?: string) {
    try {
      const cacheKey = `guild:settings:${guildId}`;
      let settings = await CacheService.get<any>(cacheKey);

      if (!settings) {
        settings = await prisma.guildSettings.findUnique({ where: { guildId } });
        if (settings) await CacheService.set(cacheKey, settings, 300);
      }

      let targetChannelId = settings?.levelUpChannelId || fallbackChannelId;
      if (!targetChannelId) return; // Cannot notify if no channel is known

      // Use a fire-and-forget message, we need access to the discord client here
      // but since we are inside a service, we rely on the global client or just 
      // let the caller pass the channel object if possible.
      // Wait, we don't have the client instance directly exported. We can pass the channel directly!
    } catch (error) {
      logger.error({ error, guildId, userId }, 'Failed to send achievement notification');
    }
  }

  // Adjusted notifyUnlock to accept a TextChannel directly for fallback
  private static async notifyUnlockWithChannel(guildId: string, userId: string, achievement: Achievement, fallbackChannel?: TextChannel) {
    try {
      const cacheKey = `guild:settings:${guildId}`;
      let settings = await CacheService.get<any>(cacheKey);

      if (!settings) {
        settings = await prisma.guildSettings.findUnique({ where: { guildId } });
        if (settings) await CacheService.set(cacheKey, settings, 300);
      }

      let channelToSend: TextChannel | undefined = fallbackChannel;

      // If a specific level-up channel is configured, try to use it
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
      logger.error({ error, guildId, userId, achievementKey: achievement.key }, 'Failed to send achievement notification');
    }
  }

  /**
   * Core logic to check and unlock achievements based on a predicate.
   */
  private static async checkAndUnlock(
    profileId: string,
    guildId: string,
    userId: string,
    achievementsToCheck: Achievement[],
    fallbackChannel?: TextChannel
  ) {
    try {
      // Get all already unlocked achievements for this profile
      const unlockedRecords = await prisma.userAchievement.findMany({
        where: { profileId },
        select: { achievementKey: true },
      });
      const unlockedKeys = new Set(unlockedRecords.map((r) => r.achievementKey));

      for (const achievement of achievementsToCheck) {
        if (!unlockedKeys.has(achievement.key)) {
          // Attempt to unlock it atomically
          try {
            await prisma.userAchievement.create({
              data: {
                profileId,
                achievementKey: achievement.key,
              },
            });
            // Successfully unlocked!
            await this.notifyUnlockWithChannel(guildId, userId, achievement, fallbackChannel);
          } catch (createError: any) {
            // Ignore unique constraint violation (P2002), meaning someone else unlocked it concurrently
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

  /**
   * Check messaging achievements
   */
  public static async checkMessagingAchievements(profile: any, fallbackChannel?: TextChannel) {
    const relevantAchievements = achievementsRegistry.filter(
      (a) => a.type === 'MESSAGING' && profile.messagesSent >= a.threshold
    );
    if (relevantAchievements.length > 0) {
      await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
    }
  }

  /**
   * Check leveling achievements
   */
  public static async checkLevelingAchievements(profile: any, fallbackChannel?: TextChannel) {
    const relevantAchievements = achievementsRegistry.filter(
      (a) => a.type === 'LEVELING' && profile.level >= a.threshold
    );
    if (relevantAchievements.length > 0) {
      await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
    }
  }

  /**
   * Check economy achievements
   */
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
      await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
    }
  }

  public static getUserAchievements(unlockedKeys: string[]) {
    return achievementsRegistry.filter(a => unlockedKeys.includes(a.key));
  }
}
