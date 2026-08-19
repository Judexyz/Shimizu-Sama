import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';
import { ManorTheme } from '../../utils/theme.js';
import { EmbedBuilder } from 'discord.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the ban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(ManorTheme.colors.error)
            .setDescription(
              `${ManorTheme.emojis.error} This decree can only be executed within the manor grounds.`
            ),
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
      await guild.members.ban(targetUser, { reason });
      await ModerationService.logCase(guild.id, targetUser.id, moderator.id, 'Ban', reason);

      const embed = LoggingService.buildModerationEmbed(
        'Ban',
        targetUser,
        moderator.user,
        reason,
        ManorTheme.colors.error as number
      );
      await LoggingService.logAction(guild, LogType.MODERATION, embed);

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(ManorTheme.colors.success)
            .setDescription(
              `${ManorTheme.emojis.moderation} By the manor's decree, **${targetUser.tag}** has been formally banished from the grounds.`
            ),
        ],
      });
    } catch {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(ManorTheme.colors.error)
            .setDescription(
              `${ManorTheme.emojis.error} I lack the authority to banish this guest. Please check my permissions.`
            ),
        ],
      });
    }
  },
};

export default command;
