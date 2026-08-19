import { prisma } from '../../database/prisma.js';
import { achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';
export class AchievementService {
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
                return;
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to send achievement notification');
        }
    }
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
    static async checkAndUnlock(profileId, guildId, userId, achievementsToCheck, fallbackChannel) {
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
                    }
                    catch (createError) {
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
    static async checkMessagingAchievements(profile, fallbackChannel) {
        const relevantAchievements = achievementsRegistry.filter((a) => a.type === 'MESSAGING' && profile.messagesSent >= a.threshold);
        if (relevantAchievements.length > 0) {
            await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
        }
    }
    static async checkLevelingAchievements(profile, fallbackChannel) {
        const relevantAchievements = achievementsRegistry.filter((a) => a.type === 'LEVELING' && profile.level >= a.threshold);
        if (relevantAchievements.length > 0) {
            await this.checkAndUnlock(profile.id, profile.guildId, profile.userId, relevantAchievements, fallbackChannel);
        }
    }
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
        return achievementsRegistry.filter((a) => unlockedKeys.includes(a.key));
    }
}
