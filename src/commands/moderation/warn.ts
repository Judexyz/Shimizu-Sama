import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to warn').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the warning').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason', true);
    const guild = interaction.guild;
    const moderator = interaction.member;

    const hierarchyError = await ModerationService.validateHierarchy(guild, moderator, targetUser);
    if (hierarchyError) {
      await interaction.reply({ content: `❌ ${hierarchyError}`, ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await ModerationService.logWarning(guild.id, targetUser.id, moderator.id, reason);

      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (targetMember) {
        await targetMember
          .send(`⚠️ You have been warned in **${guild.name}** for: ${reason}`)
          .catch(() => null);
      }

      const embed = LoggingService.buildModerationEmbed(
        'Warn',
        targetUser,
        moderator.user,
        reason,
        0xffff00
      );
      await LoggingService.logAction(guild, LogType.MODERATION, embed);

      await interaction.followUp(`✅ Successfully warned **${targetUser.tag}**.`);
    } catch {
      await interaction.followUp(`❌ Failed to warn the user.`);
    }
  },
};

export default command;
