import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, } from 'discord.js';
import { ManorTheme } from '../../utils/theme.js';
import { EmbedBuilder } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Deletes a number of recent messages in the channel.')
        .addIntegerOption((option) => option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
        .addUserOption((option) => option
        .setName('target')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild() ||
            !interaction.channel ||
            !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} The maids can only sweep text channels within the manor.`),
                ],
                ephemeral: true,
            });
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
                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.error} There is no parchment here to discard.`),
                    ],
                });
                return;
            }
            await interaction.channel.bulkDelete(messages, true);
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.success)
                        .setDescription(`🧹 The maids have swiftly swept away **${messages.size}** discarded notes.`),
                ],
            });
        }
        catch {
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} The maids encountered an issue while cleaning. Keep in mind that notes older than 14 days are permanent fixtures.`),
                ],
            });
        }
    },
};
export default command;
