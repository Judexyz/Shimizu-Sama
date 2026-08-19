import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { prisma } from '../../database/prisma.js';
import { achievementsRegistry } from '../../config/achievements.js';
import { logger } from '../../utils/logger.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your unlocked and locked achievements.')
        .addUserOption(option => option.setName('user')
        .setDescription('The user whose achievements you want to view')
        .setRequired(false))
        .addStringOption(option => option.setName('category')
        .setDescription('Filter achievements by category')
        .setRequired(false)
        .addChoices({ name: 'All', value: 'ALL' }, { name: 'Messaging', value: 'MESSAGING' }, { name: 'Leveling', value: 'LEVELING' }, { name: 'Economy', value: 'ECONOMY' })),
    execute: async (interaction) => {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const categoryFilter = interaction.options.getString('category') || 'ALL';
        try {
            const profile = await EconomyService.getProfile(interaction.guildId, targetUser.id);
            const unlockedRecords = await prisma.userAchievement.findMany({
                where: { profileId: profile.id }
            });
            const unlockedMap = new Map(unlockedRecords.map(r => [r.achievementKey, r.unlockedAt]));
            const filteredAchievements = achievementsRegistry.filter(a => categoryFilter === 'ALL' || a.type === categoryFilter);
            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Achievements`)
                .setColor('#FFD700');
            let description = `**Progress:** ${unlockedRecords.length} / ${achievementsRegistry.length} Unlocked\n\n`;
            // Helper to calculate progress for locked achievements
            const getProgressString = (a) => {
                let current = 0;
                if (a.type === 'MESSAGING') {
                    current = profile.messagesSent;
                }
                else if (a.type === 'LEVELING') {
                    current = profile.level;
                }
                else if (a.type === 'ECONOMY') {
                    switch (a.key) {
                        case 'first_daily':
                            current = profile.dailyClaims;
                            break;
                        case 'first_work':
                        case 'hard_worker':
                            current = profile.workCompletions;
                            break;
                        case 'first_payment':
                            current = profile.paymentsSent;
                            break;
                        case 'first_purchase':
                            current = profile.shopPurchases;
                            break;
                        case 'coins_10000':
                        case 'millionaire':
                        case 'entrepreneur':
                            current = profile.totalCoinsEarned;
                            break;
                    }
                }
                return `*Progress: ${current} / ${a.threshold}*`;
            };
            for (const ach of filteredAchievements) {
                if (unlockedMap.has(ach.key)) {
                    const unlockedDate = unlockedMap.get(ach.key).toLocaleDateString();
                    description += `🏆 **${ach.name}**\n${ach.description}\n*Unlocked: ${unlockedDate}*\n\n`;
                }
                else {
                    description += `🔒 **${ach.name}**\n${ach.description}\n${getProgressString(ach)}\n\n`;
                }
            }
            // If the description gets too long for a single embed (limit is 4096), we should slice it.
            // For now, with ~13 achievements, it easily fits.
            if (description.length > 4096) {
                description = description.substring(0, 4090) + '...';
            }
            embed.setDescription(description);
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId, userId: targetUser.id }, 'Error in /achievements command');
            await interaction.reply({ content: 'Failed to retrieve achievements.', ephemeral: true });
        }
    },
};
export default command;
