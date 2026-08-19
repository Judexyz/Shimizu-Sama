import { GuildMember, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { CacheService } from '../cacheService.js';
import { ModerationService } from '../moderationService.js';
import { LoggingService, LogType } from '../loggingService.js';
import { logger } from '../../utils/logger.js';

export class RaidProtectionService {
  static async handleJoin(member: GuildMember): Promise<string | null> {
    const guild = member.guild;
    const configKey = `raidconfig:${guild.id}`;

    let config = await CacheService.get<any>(configKey);
    if (!config) {
      config = await prisma.raidProtection.findUnique({ where: { guildId: guild.id } });
      if (!config) return null;
      await CacheService.set(configKey, config, 300);
    }

    if (!config.enabled) return null;

    const joinKey = `raidjoins:${guild.id}`;

    const joins = await CacheService.pushToArray<number>(joinKey, Date.now(), config.timeWindow);

    const now = Date.now();
    const recentJoins = joins.filter((time) => now - time <= config.timeWindow * 1000);

    await CacheService.set(joinKey, recentJoins, config.timeWindow);

    if (recentJoins.length >= config.joinThreshold) {
      return await this.executeRaidAction(member, config);
    }

    return null;
  }

  private static async executeRaidAction(member: GuildMember, config: any): Promise<string | null> {
    const guild = member.guild;
    const reason = `Automated Raid Protection: Triggered by ${config.joinThreshold} joins within ${config.timeWindow} seconds.`;

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Raid Detected!')
      .setColor(0xff0000)
      .setDescription(
        `A sudden spike in joins was detected. Action configured: **${config.action}**`
      )
      .addFields({ name: 'Triggered By', value: `${member.user.tag} (<@${member.id}>)` });

    await LoggingService.logAction(guild, LogType.SERVER, embed);

    const botMember = await guild.members.fetch(guild.client.user.id);
    const hierarchyError = await ModerationService.validateHierarchy(guild, botMember, member);

    if (hierarchyError && config.action !== 'ALERT') {
      logger.warn(
        `Raid Protection cannot execute ${config.action} on ${member.id} due to hierarchy.`
      );
      return null;
    }

    try {
      if (config.action === 'KICK') {
        await member.kick(reason);
        await ModerationService.logCase(guild.id, member.id, botMember.id, 'Kick', reason);
        return 'KICK';
      } else if (config.action === 'BAN') {
        await member.ban({ reason });
        await ModerationService.logCase(guild.id, member.id, botMember.id, 'Ban', reason);
        return 'BAN';
      } else if (config.action === 'LOCK') {
        return 'LOCK';
      }
    } catch (err) {
      logger.error({ err }, 'Failed to execute raid protection action');
    }

    return 'ALERT';
  }
}
