import { Guild, GuildMember, User } from 'discord.js';
import { prisma } from '../database/prisma.js';

export class ModerationService {
  /**
   * Validates if an action can be performed on the target by the moderator.
   */
  static async validateHierarchy(
    guild: Guild,
    moderator: GuildMember | User,
    target: GuildMember | User
  ): Promise<string | null> {
    if (target.id === guild.ownerId) {
      return 'You cannot moderate the server owner.';
    }
    
    if (moderator.id === target.id) {
      return 'You cannot moderate yourself.';
    }

    if (target.id === guild.client.user.id) {
      return 'I cannot moderate myself.';
    }

    const targetMember = target instanceof GuildMember ? target : await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return null; // Target is not in the server, hierarchy doesn't block

    const moderatorMember = moderator instanceof GuildMember ? moderator : await guild.members.fetch(moderator.id).catch(() => null);
    if (moderatorMember && targetMember.roles.highest.position >= moderatorMember.roles.highest.position && moderator.id !== guild.ownerId) {
      return 'You cannot moderate a user with an equal or higher role.';
    }

    const botMember = await guild.members.fetch(guild.client.user.id);
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return 'I cannot moderate a user with an equal or higher role than my highest role.';
    }

    return null;
  }

  static async logCase(
    guildId: string,
    userId: string,
    moderatorId: string,
    action: string,
    reason: string | null
  ) {
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

  static async logWarning(
    guildId: string,
    userId: string,
    moderatorId: string,
    reason: string | null
  ) {
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
