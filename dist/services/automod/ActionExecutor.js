import { ModerationService } from '../moderationService.js';
import { LoggingService, LogType } from '../loggingService.js';
export class ActionExecutor {
    static async execute(message, violation, action) {
        if (!message.guild || !message.member)
            return;
        const guild = message.guild;
        const target = message.member;
        const botMember = await guild.members.fetch(guild.client.user.id);
        // Safety check: Don't execute actions if bot is lower hierarchy
        const hierarchyError = await ModerationService.validateHierarchy(guild, botMember, target);
        if (hierarchyError && action !== 'DELETE' && action !== 'LOG') {
            return; // Cannot execute punitive actions
        }
        const reason = `AutoMod [${violation.type}]: ${violation.reason}`;
        try {
            switch (action.toUpperCase()) {
                case 'DELETE':
                    if (message.deletable) {
                        await message.delete();
                    }
                    break;
                case 'WARN':
                    if (message.deletable)
                        await message.delete().catch(() => null);
                    await ModerationService.logWarning(guild.id, target.id, botMember.id, reason);
                    await target.send(`⚠️ You have been warned in **${guild.name}** for: ${violation.reason}`).catch(() => null);
                    break;
                case 'TIMEOUT':
                    if (message.deletable)
                        await message.delete().catch(() => null);
                    await target.timeout(10 * 60 * 1000, reason); // Default 10 min
                    await ModerationService.logCase(guild.id, target.id, botMember.id, 'Timeout', reason);
                    break;
                case 'KICK':
                    if (message.deletable)
                        await message.delete().catch(() => null);
                    await target.kick(reason);
                    await ModerationService.logCase(guild.id, target.id, botMember.id, 'Kick', reason);
                    break;
                case 'BAN':
                    if (message.deletable)
                        await message.delete().catch(() => null);
                    await target.ban({ reason });
                    await ModerationService.logCase(guild.id, target.id, botMember.id, 'Ban', reason);
                    break;
                case 'LOG':
                default:
                    // Just log it
                    break;
            }
            // Send log to AutoMod channel
            const embed = LoggingService.buildModerationEmbed(`AutoMod: ${action.toUpperCase()}`, target.user, botMember.user, reason, 0xff8c00);
            // Include the message content in the log if applicable
            if (violation.context.text) {
                embed.addFields({ name: 'Message Content', value: String(violation.context.text).substring(0, 1024) });
            }
            await LoggingService.logAction(guild, LogType.AUTOMOD, embed);
        }
        catch (error) {
            // Action failed (e.g. missing permissions, message already deleted by Discord AutoMod)
            // We log the failure silently so it doesn't crash the bot
        }
    }
}
