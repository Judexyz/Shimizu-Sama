import { SlashCommandBuilder, MessageFlags, } from 'discord.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { logger } from '../../utils/logger.js';
import { ManorTheme } from '../../utils/theme.js';
import { EmbedBuilder } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or another user's coin balance.")
        .addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(false)),
    execute: async (interaction) => {
        if (!interaction.guildId) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} The manor's treasury can only be accessed within the estate.`),
                ],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const targetUser = interaction.options.getUser('user') || interaction.user;
        try {
            const balance = await EconomyService.getBalance(interaction.guildId, targetUser.id);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.primary)
                        .setDescription(`${ManorTheme.emojis.money} The ledger shows that **${targetUser.username}** possesses **${balance}** coins in the manor's treasury.`),
                ],
            });
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /balance command');
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} The treasurer is currently indisposed and cannot retrieve the ledger.`),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
export default command;
