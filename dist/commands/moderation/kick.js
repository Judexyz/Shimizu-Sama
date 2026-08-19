import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';
import { ManorTheme } from '../../utils/theme.js';
import { EmbedBuilder } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a user from the server.')
        .addUserOption((option) => option.setName('target').setDescription('The user to kick').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('The reason for the kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} This decree can only be executed within the manor grounds.`),
                ],
                ephemeral: true,
            });
            return;
        }
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const moderator = interaction.member;
        const hierarchyError = await ModerationService.validateHierarchy(guild, moderator, targetUser);
        if (hierarchyError) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} ${hierarchyError}`),
                ],
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.error} That individual is not currently visiting the manor.`),
                    ],
                });
                return;
            }
            await targetMember.kick(reason);
            await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Kick', reason);
            const embed = LoggingService.buildModerationEmbed('Kick', targetUser, moderator.user, reason, ManorTheme.colors.error);
            await LoggingService.logAction(guild, LogType.MODERATION, embed);
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.success)
                        .setDescription(`${ManorTheme.emojis.moderation} **${targetUser.tag}** has been politely escorted off the premises.`),
                ],
            });
        }
        catch {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} I am unable to escort this guest out. Please check my permissions.`),
                ],
            });
        }
    },
};
export default command;
