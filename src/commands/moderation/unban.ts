import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { ModerationService } from '../../services/moderationService.js';
import { LoggingService, LogType } from '../../services/loggingService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user from the server.')
    .addStringOption((option) =>
      option.setName('target_id').setDescription('The ID of the user to unban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the unban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const targetId = interaction.options.getString('target_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;
    const moderator = interaction.member;

    await interaction.deferReply({ ephemeral: true });

    try {
      const ban = await guild.bans.fetch(targetId).catch(() => null);
      if (!ban) {
        await interaction.followUp(`❌ That user is not banned or the ID is invalid.`);
        return;
      }

      await guild.bans.remove(targetId, reason);
      await ModerationService.logCase(guild.id, targetId, moderator.id, 'Unban', reason);

      const embed = LoggingService.buildModerationEmbed(
        'Unban',
        ban.user,
        moderator.user,
        reason,
        0x00ff00
      );
      await LoggingService.logAction(guild, LogType.MODERATION, embed);

      await interaction.followUp(`✅ Successfully unbanned **${ban.user.tag}**.`);
    } catch {
      await interaction.followUp(`❌ Failed to unban the user. Please check my permissions.`);
    }
  },
};

export default command;
