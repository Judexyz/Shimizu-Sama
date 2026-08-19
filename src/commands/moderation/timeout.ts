import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Times out a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to timeout').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('duration').setDescription('Duration in minutes').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the timeout').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    const durationMinutes = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;
    const moderator = interaction.member;

    if (durationMinutes < 1 || durationMinutes > 40320) { // Discord max is 28 days
       await interaction.reply({ content: 'Duration must be between 1 and 40,320 minutes (28 days).', ephemeral: true });
       return;
    }

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

      await targetMember.timeout(durationMinutes * 60 * 1000, reason);
      await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Timeout', reason);

      const embed = LoggingService.buildModerationEmbed('Timeout', targetUser, moderator.user, reason, 0xffa500, `${durationMinutes} minutes`);
      await LoggingService.logAction(guild, LogType.MODERATION, embed);

      await interaction.followUp(`✅ Successfully timed out **${targetUser.tag}** for ${durationMinutes} minutes.`);
    } catch {
      await interaction.followUp(`❌ Failed to timeout the user. Please check my permissions.`);
    }
  },
};

export default command;
