import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, } from 'discord.js';
import { ManorTheme } from '../../utils/theme.js';
import { EmbedBuilder } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Sets the slowmode for the current channel.')
        .addIntegerOption((option) => option
        .setName('duration')
        .setDescription('Slowmode duration in seconds (0 to disable)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild() ||
            !interaction.channel ||
            !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} The flow of time can only be altered in text channels within the manor.`),
                ],
                ephemeral: true,
            });
            return;
        }
        const duration = interaction.options.getInteger('duration', true);
        try {
            await interaction.channel.setRateLimitPerUser(duration, `Slowmode set by ${interaction.user.tag}`);
            if (duration === 0) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.success)
                            .setDescription(`⏳ Time flows normally again. Guests may speak freely.`),
                    ],
                });
            }
            else {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.success)
                            .setDescription(`⏳ The maids have instituted a pace of **${duration}** seconds between each spoken word.`),
                    ],
                });
            }
        }
        catch {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} I lack the authority to alter the flow of time here.`),
                ],
                ephemeral: true,
            });
        }
    },
};
export default command;
