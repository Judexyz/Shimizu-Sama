import { SlashCommandBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlocks the current channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild() || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'This command can only be used in a text channel.', ephemeral: true });
            return;
        }
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: null,
            }, { reason: `Channel unlocked by ${interaction.user.tag}` });
            await interaction.reply(`🔓 Channel has been unlocked.`);
        }
        catch {
            await interaction.reply({ content: `❌ Failed to unlock the channel. Please check my permissions.`, ephemeral: true });
        }
    },
};
export default command;
