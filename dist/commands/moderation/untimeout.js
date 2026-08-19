import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Removes a timeout from a user.')
        .addUserOption((option) => option.setName('target').setDescription('The user to untimeout').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('The reason for the untimeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
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
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                await interaction.followUp(`❌ User is not in the server.`);
                return;
            }
            await targetMember.timeout(null, reason);
            await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Untimeout', reason);
            const embed = LoggingService.buildModerationEmbed('Untimeout', targetUser, moderator.user, reason, 0x00ff00);
            await LoggingService.logAction(guild, LogType.MODERATION, embed);
            await interaction.followUp(`✅ Successfully removed timeout from **${targetUser.tag}**.`);
        }
        catch {
            await interaction.followUp(`❌ Failed to untimeout the user. Please check my permissions.`);
        }
    },
};
export default command;
