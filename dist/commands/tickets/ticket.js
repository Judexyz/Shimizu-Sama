import { SlashCommandBuilder } from 'discord.js';
import { TicketService } from '../../services/ticket/TicketService.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the current ticket.')
        .addSubcommand((subcommand) => subcommand.setName('close').setDescription('Close the current ticket'))
        .addSubcommand((subcommand) => subcommand
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption((option) => option.setName('user').setDescription('The user to add').setRequired(true)))
        .addSubcommand((subcommand) => subcommand
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption((option) => option.setName('user').setDescription('The user to remove').setRequired(true))),
    execute: async (interaction) => {
        if (!interaction.guildId || !interaction.channel)
            return;
        const ticket = await prisma.ticket.findUnique({
            where: { channelId: interaction.channel.id },
        });
        if (!ticket) {
            await interaction.reply({
                content: '❌ This command can only be used inside a ticket channel.',
                ephemeral: true,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'close') {
                await TicketService.closeTicket(interaction, interaction.channel);
            }
            else if (subcommand === 'add') {
                const targetUser = interaction.options.getUser('user', true);
                await TicketService.addUser(interaction.channel, targetUser);
                await interaction.reply(`✅ Added <@${targetUser.id}> to the ticket.`);
            }
            else if (subcommand === 'remove') {
                const targetUser = interaction.options.getUser('user', true);
                await TicketService.removeUser(interaction.channel, targetUser);
                await interaction.reply(`✅ Removed <@${targetUser.id}> from the ticket.`);
            }
        }
        catch (error) {
            logger.error({ error, guildId: interaction.guildId, subcommand }, 'Failed to manage ticket');
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while managing the ticket.',
                    ephemeral: true,
                });
            }
        }
    },
};
export default command;
