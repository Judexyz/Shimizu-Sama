import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../../types/index.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes a number of recent messages in the channel.')
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption((option) =>
      option.setName('target').setDescription('Only delete messages from this user').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
      await interaction.reply({ content: 'This command can only be used in a text channel.', ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('target', false);

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: amount });

      if (targetUser) {
        messages = messages.filter((m) => m.author.id === targetUser.id);
      }

      if (messages.size === 0) {
         await interaction.followUp(`No messages found to delete.`);
         return;
      }

      await interaction.channel.bulkDelete(messages, true); // true = filter out messages older than 14 days

      await interaction.followUp(`✅ Successfully cleared **${messages.size}** messages.`);
    } catch {
      await interaction.followUp(`❌ Failed to clear messages. Messages older than 14 days cannot be bulk deleted.`);
    }
  },
};

export default command;
