import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
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

      await targetMember.kick(reason);
      await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Kick', reason);

      const embed = LoggingService.buildModerationEmbed('Kick', targetUser, moderator.user, reason, 0xffa500);
      await LoggingService.logAction(guild, LogType.MODERATION, embed);

      await interaction.followUp(`✅ Successfully kicked **${targetUser.tag}**.`);
    } catch {
      await interaction.followUp(`❌ Failed to kick the user. Please check my permissions.`);
    }
  },
};

export default command;
