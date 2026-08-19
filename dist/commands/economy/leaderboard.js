import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top users in this server.')
        .addStringOption((option) => option
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(true)
        .addChoices({ name: 'XP', value: 'xp' }, { name: 'Balance', value: 'balance' })),
    execute: async (interaction) => {
        if (!interaction.guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true,
            });
            return;
        }
        const type = interaction.options.getString('type', true);
        try {
            const topUsers = await prisma.userGuildProfile.findMany({
                where: { guildId: interaction.guildId },
                orderBy: type === 'xp' ? { xp: 'desc' } : { balance: 'desc' },
                take: 10,
            });
            if (topUsers.length === 0) {
                await interaction.reply({ content: 'No data found for this server.', ephemeral: true });
                return;
            }
            let leaderboardStr = `🏆 **Top 10 Leaderboard (${type.toUpperCase()})**\n\n`;
            for (let i = 0; i < topUsers.length; i++) {
                const profile = topUsers[i];
                const value = type === 'xp' ? `${profile.xp} XP (Level ${profile.level})` : `${profile.balance} Coins`;
                leaderboardStr += `**${i + 1}.** <@${profile.userId}> - ${value}\n`;
            }
            await interaction.reply({ content: leaderboardStr, allowedMentions: { users: [] } });
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId }, 'Error in /leaderboard command');
            await interaction.reply({ content: 'Failed to retrieve leaderboard.', ephemeral: true });
        }
    },
};
export default command;
