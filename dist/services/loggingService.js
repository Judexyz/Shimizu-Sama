import { EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';
export var LogType;
(function (LogType) {
    LogType["MODERATION"] = "moderationLogs";
    LogType["MEMBER"] = "memberLogs";
    LogType["MESSAGE"] = "messageLogs";
    LogType["SERVER"] = "serverLogs";
    LogType["VOICE"] = "voiceLogs";
    LogType["AUTOMOD"] = "autoModLogs";
})(LogType || (LogType = {}));
export class LoggingService {
    static async logAction(guild, type, embed) {
        try {
            const config = await prisma.logConfig.findUnique({
                where: { guildId: guild.id },
            });
            if (!config)
                return;
            const channelId = config[type];
            if (!channelId)
                return;
            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel || !(channel instanceof TextChannel))
                return;
            await channel.send({ embeds: [embed] }).catch((err) => {
                logger.warn({ err }, `Failed to send log to channel ${channelId}`);
            });
        }
        catch (err) {
            logger.error({ err }, `Error in LoggingService.logAction for guild ${guild.id}`);
        }
    }
    static buildModerationEmbed(action, target, moderator, reason, color, duration) {
        const embed = new EmbedBuilder()
            .setTitle(`Moderation Action: ${action}`)
            .setColor(color)
            .addFields({ name: 'Target', value: `${target.tag} (<@${target.id}>)`, inline: true }, { name: 'Moderator', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true }, { name: 'Reason', value: reason || 'No reason provided', inline: false })
            .setTimestamp();
        if (duration) {
            embed.addFields({ name: 'Duration', value: duration, inline: true });
        }
        return embed;
    }
}
