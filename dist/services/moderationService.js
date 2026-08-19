import { GuildMember } from 'discord.js';
import { prisma } from '../database/prisma.js';
export class ModerationService {
    static async validateHierarchy(guild, moderator, target) {
        if (target.id === guild.ownerId) {
            return 'You cannot moderate the server owner.';
        }
        if (moderator.id === target.id) {
            return 'You cannot moderate yourself.';
        }
        if (target.id === guild.client.user.id) {
            return 'I cannot moderate myself.';
        }
        const targetMember = target instanceof GuildMember
            ? target
            : await guild.members.fetch(target.id).catch(() => null);
        if (!targetMember)
            return null;
        const moderatorMember = moderator instanceof GuildMember
            ? moderator
            : await guild.members.fetch(moderator.id).catch(() => null);
        if (moderatorMember &&
            targetMember.roles.highest.position >= moderatorMember.roles.highest.position &&
            moderator.id !== guild.ownerId) {
            return 'You cannot moderate a user with an equal or higher role.';
        }
        const botMember = await guild.members.fetch(guild.client.user.id);
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return 'I cannot moderate a user with an equal or higher role than my highest role.';
        }
        return null;
    }
    static async logCase(guildId, userId, moderatorId, action, reason) {
        return await prisma.moderationCase.create({
            data: {
                guildId,
                userId,
                moderatorId,
                action,
                reason,
            },
        });
    }
    static async logWarning(guildId, userId, moderatorId, reason) {
        return await prisma.warning.create({
            data: {
                guildId,
                userId,
                moderatorId,
                reason,
            },
        });
    }
}
