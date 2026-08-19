import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, } from 'discord.js';
import { prisma } from '../../database/prisma.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Lists warnings for a user.')
        .addUserOption((option) => option.setName('target').setDescription('The user to check').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true,
            });
            return;
        }
        const targetUser = interaction.options.getUser('target', true);
        await interaction.deferReply({ ephemeral: true });
        try {
            const warnings = await prisma.warning.findMany({
                where: { guildId: interaction.guildId, userId: targetUser.id },
                orderBy: { createdAt: 'desc' },
            });
            if (warnings.length === 0) {
                await interaction.followUp(`✅ **${targetUser.tag}** has no warnings.`);
                return;
            }
            const embed = new EmbedBuilder()
                .setTitle(`Warnings for ${targetUser.tag}`)
                .setColor(0xffff00)
                .setDescription(`Total Warnings: **${warnings.length}**`);
            const displayWarnings = warnings.slice(0, 20);
            displayWarnings.forEach((w) => {
                embed.addFields({
                    name: `Warning ID: ${w.id}`,
                    value: `**Reason:** ${w.reason}\n**Date:** <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`,
                });
            });
            await interaction.followUp({ embeds: [embed] });
        }
        catch {
            await interaction.followUp(`❌ Failed to retrieve warnings.`);
        }
    },
};
export default command;
