import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption((option) => option.setName('target').setDescription('The user to ban').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('The reason for the ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const moderator = interaction.member;
        const hierarchyError = await ModerationService.validateHierarchy(guild, moderator, targetUser);
        if (hierarchyError) {
            await interaction.reply({ content: `❌ ${hierarchyError}`, ephemeral: true });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            await guild.members.ban(targetUser, { reason });
            await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Ban', reason);
            const embed = LoggingService.buildModerationEmbed('Ban', targetUser, moderator.user, reason, 0xff0000);
            await LoggingService.logAction(guild, LogType.MODERATION, embed);
            await interaction.followUp(`✅ Successfully banned **${targetUser.tag}**.`);
        }
        catch {
            await interaction.followUp(`❌ Failed to ban the user. Please check my permissions.`);
        }
    },
};
export default command;
