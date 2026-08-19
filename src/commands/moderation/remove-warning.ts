import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('remove-warning')
    .setDescription('Removes a specific warning by its ID.')
    .addStringOption((option) =>
      option.setName('warning_id').setDescription('The ID of the warning to remove').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const warningId = interaction.options.getString('warning_id', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const warning = await prisma.warning.findUnique({
        where: { id: warningId },
      });

      if (!warning || warning.guildId !== interaction.guildId) {
        await interaction.followUp(`❌ Warning not found or it belongs to another server.`);
        return;
      }

      await prisma.warning.delete({
        where: { id: warningId },
      });

      await interaction.followUp(`✅ Successfully removed warning \`${warningId}\`.`);
    } catch {
      await interaction.followUp(`❌ Failed to remove the warning. Invalid ID format?`);
    }
  },
};

export default command;
