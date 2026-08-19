import { prisma } from '../../database/prisma.js';
import { CacheService } from '../cacheService.js';
import { logger } from '../../utils/logger.js';
import { AchievementService } from './AchievementService.js';
export class LevelingService {
    static xpCooldowns = new Map();
    static requiredTotalXp(level) {
        return 100 * Math.pow(level, 2);
    }
    static calculateLevelFromXp(xp) {
        return Math.floor(Math.sqrt(xp / 100));
    }
    static async handleMessage(message) {
        if (!message.guild || message.author.bot || message.system)
            return;
        try {
            const cacheKey = `guild:settings:${message.guild.id}`;
            let settings = await CacheService.get(cacheKey);
            if (!settings) {
                settings = await prisma.guildSettings.findUnique({
                    where: { guildId: message.guild.id },
                });
                if (settings) {
                    await CacheService.set(cacheKey, settings, 300);
                }
            }
            if (settings && settings.levelingEnabled === false)
                return;
            const guildId = message.guild.id;
            const userId = message.author.id;
            const cooldownKey = `${guildId}_${userId}`;
            const lastXpTime = this.xpCooldowns.get(cooldownKey);
            const now = Date.now();
            if (lastXpTime && now - lastXpTime < 60000) {
                return;
            }
            this.xpCooldowns.set(cooldownKey, now);
            const xpToAdd = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
            await prisma.guild.upsert({
                where: { id: guildId },
                update: {},
                create: { id: guildId },
            });
            await prisma.user.upsert({
                where: { id: userId },
                update: {},
                create: { id: userId },
            });
            const profile = await prisma.userGuildProfile.upsert({
                where: {
                    guildId_userId: {
                        guildId,
                        userId,
                    },
                },
                update: {
                    xp: { increment: xpToAdd },
                    messagesSent: { increment: 1 },
                },
                create: {
                    guildId,
                    userId,
                    xp: xpToAdd,
                    messagesSent: 1,
                    level: 0,
                },
            });
            AchievementService.checkMessagingAchievements(profile, message.channel).catch((err) => {
                logger.error({ err, guildId, userId }, 'Failed to check messaging achievements');
            });
            const newCalculatedLevel = this.calculateLevelFromXp(profile.xp);
            if (newCalculatedLevel > profile.level) {
                await this.handleLevelUp(message, profile.level, newCalculatedLevel, settings);
            }
        }
        catch (error) {
            logger.error({ error, guildId: message.guild.id, userId: message.author.id }, 'Failed to process message XP');
        }
    }
    static async handleLevelUp(message, oldLevel, newLevel, settings) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        await prisma.userGuildProfile.update({
            where: {
                guildId_userId: { guildId, userId },
            },
            data: {
                level: newLevel,
            },
        });
        const rewards = await prisma.levelReward.findMany({
            where: {
                guildId,
                level: {
                    gt: oldLevel,
                    lte: newLevel,
                },
            },
        });
        const updatedProfile = await prisma.userGuildProfile.findUnique({
            where: { guildId_userId: { guildId, userId } },
        });
        if (updatedProfile) {
            AchievementService.checkLevelingAchievements(updatedProfile, message.channel).catch((err) => {
                logger.error({ err, guildId, userId }, 'Failed to check leveling achievements');
            });
        }
        if (rewards.length > 0 && message.member) {
            const roleIdsToAdd = rewards.map((r) => r.roleId);
            try {
                await message.member.roles.add(roleIdsToAdd, `Level up to ${newLevel}`);
            }
            catch (error) {
                logger.error({ error, guildId, userId, roleIdsToAdd }, 'Failed to assign level-up roles (Missing permissions?)');
            }
        }
        let channelToSend = message.channel;
        if (settings?.levelUpChannelId) {
            const customChannel = message.guild.channels.cache.get(settings.levelUpChannelId);
            if (customChannel && customChannel.isTextBased()) {
                channelToSend = customChannel;
            }
        }
        let levelUpMessage = settings?.levelUpMessage || `🎉 {user} reached level {level}!`;
        levelUpMessage = levelUpMessage
            .replace(/{user}/g, `<@${userId}>`)
            .replace(/{username}/g, message.author.username)
            .replace(/{level}/g, newLevel.toString())
            .replace(/{xp}/g, this.requiredTotalXp(newLevel).toString());
        try {
            await channelToSend.send(levelUpMessage);
        }
        catch (error) {
            logger.error({ error, guildId, channelId: channelToSend.id }, 'Failed to send level-up message');
        }
    }
}
