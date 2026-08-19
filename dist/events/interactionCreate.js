import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { GiveawayService } from '../services/giveaway/GiveawayService.js';
import { TicketService } from '../services/ticket/TicketService.js';
async function handleRolePanelButton(interaction) {
    // customId is "rolepanel_menuId_roleId"
    const parts = interaction.customId.split('_');
    if (parts.length !== 3)
        return;
    const roleId = parts[2];
    if (!interaction.inCachedGuild())
        return;
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        await interaction.followUp(`❌ The requested role no longer exists in this server.`);
        return;
    }
    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.followUp(`Removed the **${role.name}** role.`);
        }
        else {
            await member.roles.add(roleId);
            await interaction.followUp(`Added the **${role.name}** role.`);
        }
    }
    catch (err) {
        await interaction.followUp(`❌ I don't have permission to manage this role. My role needs to be higher than the requested role.`);
    }
}
const event = {
    name: Events.InteractionCreate,
    execute: async (interaction) => {
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('rolepanel_')) {
                await handleRolePanelButton(interaction);
            }
            else if (interaction.customId.startsWith('giveaway_join_')) {
                await GiveawayService.handleJoinInteraction(interaction);
            }
            else if (interaction.customId.startsWith('ticket_')) {
                await TicketService.handleInteraction(interaction);
            }
            return;
        }
        if (!interaction.isChatInputCommand())
            return;
        const client = interaction.client;
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(interaction);
        }
        catch (error) {
            logger.error({ err: error }, `Error executing ${interaction.commandName}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
export default event;
