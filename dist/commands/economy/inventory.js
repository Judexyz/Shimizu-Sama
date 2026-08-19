import { SlashCommandBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { logger } from '../../utils/logger.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your owned items.')
        .addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(false)),
    execute: async (interaction) => {
        if (!interaction.guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true,
            });
            return;
        }
        const targetUser = interaction.options.getUser('user') || interaction.user;
        try {
            const inventory = await EconomyService.getInventory(interaction.guildId, targetUser.id);
            if (inventory.length === 0) {
                await interaction.reply({
                    content: `🎒 **${targetUser.username}**'s inventory is empty.`,
                    ephemeral: true,
                });
                return;
            }
            let invStr = `🎒 **${targetUser.username}'s Inventory**\n\n`;
            for (const inv of inventory) {
                invStr += `**${inv.item.name}** x${inv.quantity}\n`;
            }
            await interaction.reply({ content: invStr });
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId, userId: interaction.user.id }, 'Error in /inventory command');
            await interaction.reply({ content: 'Failed to retrieve inventory.', ephemeral: true });
        }
    },
};
export default command;
