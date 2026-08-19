import { prisma } from '../../database/prisma.js';
import { achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';
export class AchievementService {
    /**
     * Helper to send achievement unlock notification.
     */
    static async notifyUnlock(guildId, userId, achievement, fallbackChannelId) {
        try {
            const cacheKey = `guild:settings:${guildId}`;
            let settings = await CacheService.get(cacheKey);
            if (!settings) {
                settings = await prisma.guildSettings.findUnique({ where: { guildId } });
                if (settings)
                    await CacheService.set(cacheKey, settings, 300);
            }
            let targetChannelId = settings?.levelUpChannelId || fallbackChannelId;
            if (!targetChannelId)
                return; // Cannot notify if no channel is known
            // Use a fire-and-forget message, we need access to the discord client here
            // but since we are inside a service, we rely on the global client or just 
            // let the caller pass the channel object if possible.
            // Wait, we don't have the client instance directly exported. We can pass the channel directly!
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to send achievement notification');
        }
    }
    // Adjusted notifyUnlock to accept a TextChannel directly for fallback
    static async notifyUnlockWithChannel(guildId, userId, achievement, fallbackChannel) {
        try {
            const cacheKey = `guild:settings:${guildId}`;
            let settings = await CacheService.get(cacheKey);
            if (!settings) {
                settings = await prisma.guildSettings.findUnique({ where: { guildId } });
                if (settings)
                    await CacheService.set(cacheKey, settings, 300);
            }
            let channelToSend = fallbackChannel;
            // If a specific level-up channel is configured, try to use it
            if (settings?.levelUpChannelId && fallbackChannel?.guild) {
                const customChannel = fallbackChannel.guild.channels.cache.get(settings.levelUpChannelId);
                if (customChannel && customChannel.isTextBased()) {
                    channelToSend = customChannel;
                }
            }
            if (!channelToSend)
                return;
            const messageContent = `🏆 **Achievement Unlocked: ${achievement.name}**\n<@${userId}> ${achievement.description}`;
            await channelToSend.send(messageContent);
        }
        catch (error) {
            logger.error({ error, guildId, userId, achievementKey: achievement.key }, 'Failed to send achievement notification');
        }
    }
    /**
     * Core logic to check and unlock achievements based on a predicate.
     */
    static async checkAndUnlock(profileId, guildId, userId, achievementsToCheck, fallbackChannel) {
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
                    }
                    catch (createError) {
                        // Ignore unique constraint violation (P2002), meaning someone else unlocked it concurrently
                        if (createError.code !== 'P2002') {
                            throw createError;
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Error checking achievements');
        }
    }
    /**
     * Check messaging achievements
     */
    static async checkMessagingAchievements(profile, fallbackChannel) {
        const relevantAchievements = achievementsRegistry.filter((a) => a.type === 'MESSAGING' && profile.messagesSent >= a.threshold);
        if (relevantAchievements.length > 0) {
            await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
        }
    }
    /**
     * Check leveling achievements
     */
    static async checkLevelingAchievements(profile, fallbackChannel) {
        const relevantAchievements = achievementsRegistry.filter((a) => a.type === 'LEVELING' && profile.level >= a.threshold);
        if (relevantAchievements.length > 0) {
            await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
        }
    }
    /**
     * Check economy achievements
     */
    static async checkEconomyAchievements(profile, fallbackChannel) {
        const relevantAchievements = achievementsRegistry.filter((a) => {
            if (a.type !== 'ECONOMY')
                return false;
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
    static getUserAchievements(unlockedKeys) {
        return achievementsRegistry.filter(a => unlockedKeys.includes(a.key));
    }
}
