import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { logger } from '../../utils/logger.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s coin balance.')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to check')
        .setRequired(false)),
    execute: async (interaction) => {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
            return;
        }
        const targetUser = interaction.options.getUser('user') || interaction.user;
        try {
            const balance = await EconomyService.getBalance(interaction.guildId, targetUser.id);
            await interaction.reply(`🪙 **${targetUser.username}** has a balance of **${balance} coins**.`);
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /balance command');
            await interaction.reply({ content: 'Failed to retrieve balance.', flags: MessageFlags.Ephemeral });
        }
    },
};
export default command;
