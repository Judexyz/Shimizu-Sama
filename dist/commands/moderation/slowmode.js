import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Sets the slowmode for the current channel.')
        .addIntegerOption((option) => option.setName('duration').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'This command can only be used in a text channel.', ephemeral: true });
            return;
        }
        const duration = interaction.options.getInteger('duration', true);
        try {
            await interaction.channel.setRateLimitPerUser(duration, `Slowmode set by ${interaction.user.tag}`);
            if (duration === 0) {
                await interaction.reply(`✅ Slowmode disabled.`);
            }
            else {
                await interaction.reply(`✅ Slowmode set to **${duration}** seconds.`);
            }
        }
        catch {
            await interaction.reply({ content: `❌ Failed to set slowmode. Please check my permissions.`, ephemeral: true });
        }
    },
};
export default command;
