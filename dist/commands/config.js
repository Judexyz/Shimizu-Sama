import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { CacheService } from '../services/cacheService.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure server settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // Welcome Group
        .addSubcommandGroup(group => group.setName('welcome').setDescription('Configure welcome settings')
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable welcome messages'))
        .addSubcommand(sub => sub.setName('disable').setDescription('Disable welcome messages'))
        .addSubcommand(sub => sub.setName('set-channel').setDescription('Set welcome channel').addChannelOption(opt => opt.setName('channel').setDescription('The channel').setRequired(true)))
        .addSubcommand(sub => sub.setName('set-message').setDescription('Set welcome message').addStringOption(opt => opt.setName('message').setDescription('Message text (supports variables)').setRequired(true))))
        // Goodbye Group
        .addSubcommandGroup(group => group.setName('goodbye').setDescription('Configure goodbye settings')
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable goodbye messages'))
        .addSubcommand(sub => sub.setName('disable').setDescription('Disable goodbye messages'))
        .addSubcommand(sub => sub.setName('set-channel').setDescription('Set goodbye channel').addChannelOption(opt => opt.setName('channel').setDescription('The channel').setRequired(true)))
        .addSubcommand(sub => sub.setName('set-message').setDescription('Set goodbye message').addStringOption(opt => opt.setName('message').setDescription('Message text (supports variables)').setRequired(true))))
        // Autorole Group
        .addSubcommandGroup(group => group.setName('autorole').setDescription('Configure autoroles')
        .addSubcommand(sub => sub.setName('add').setDescription('Add an autorole').addRoleOption(opt => opt.setName('role').setDescription('The role').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove an autorole').addRoleOption(opt => opt.setName('role').setDescription('The role').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all autoroles')))
        // Raid Protection Group
        .addSubcommandGroup(group => group.setName('raid').setDescription('Configure raid protection')
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable raid protection'))
        .addSubcommand(sub => sub.setName('disable').setDescription('Disable raid protection'))
        .addSubcommand(sub => sub.setName('set').setDescription('Configure raid protection parameters')
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Number of joins').setRequired(true))
        .addIntegerOption(opt => opt.setName('time_window').setDescription('Time window in seconds').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('Action to take').setRequired(true).addChoices({ name: 'Alert Only', value: 'ALERT' }, { name: 'Kick', value: 'KICK' }, { name: 'Ban', value: 'BAN' })))),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply({ ephemeral: true });
        const group = interaction.options.getSubcommandGroup();
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        if (group === 'welcome' || group === 'goodbye') {
            const isWelcome = group === 'welcome';
            let config = await prisma.welcomeConfig.findUnique({ where: { guildId } });
            if (!config)
                config = await prisma.welcomeConfig.create({ data: { guildId } });
            if (subCommand === 'enable' || subCommand === 'disable') {
                const enabled = subCommand === 'enable';
                await prisma.welcomeConfig.update({
                    where: { guildId },
                    data: isWelcome ? { enabled } : { enabled } // We use the same enabled toggle for now, or separate if needed
                });
                await interaction.followUp(`✅ Successfully ${enabled ? 'enabled' : 'disabled'} ${group} messages.`);
            }
            if (subCommand === 'set-channel') {
                const channel = interaction.options.getChannel('channel', true);
                await prisma.welcomeConfig.update({
                    where: { guildId },
                    data: isWelcome ? { channelId: channel.id } : { goodbyeChannelId: channel.id }
                });
                await interaction.followUp(`✅ Successfully set ${group} channel to <#${channel.id}>.`);
            }
            if (subCommand === 'set-message') {
                const msg = interaction.options.getString('message', true);
                await prisma.welcomeConfig.update({
                    where: { guildId },
                    data: isWelcome ? { message: msg } : { goodbyeMessage: msg }
                });
                await interaction.followUp(`✅ Successfully set ${group} message to:\n${msg}`);
            }
        }
        if (group === 'autorole') {
            if (subCommand === 'add') {
                const role = interaction.options.getRole('role', true);
                const existing = await prisma.autorole.findFirst({ where: { guildId, roleId: role.id } });
                if (existing) {
                    await interaction.followUp(`❌ That role is already an autorole.`);
                    return;
                }
                await prisma.autorole.create({ data: { guildId, roleId: role.id } });
                await interaction.followUp(`✅ Added **${role.name}** to autoroles.`);
            }
            if (subCommand === 'remove') {
                const role = interaction.options.getRole('role', true);
                const existing = await prisma.autorole.findFirst({ where: { guildId, roleId: role.id } });
                if (!existing) {
                    await interaction.followUp(`❌ That role is not an autorole.`);
                    return;
                }
                await prisma.autorole.delete({ where: { id: existing.id } });
                await interaction.followUp(`✅ Removed **${role.name}** from autoroles.`);
            }
            if (subCommand === 'list') {
                const roles = await prisma.autorole.findMany({ where: { guildId } });
                if (roles.length === 0) {
                    await interaction.followUp(`No autoroles configured.`);
                }
                else {
                    await interaction.followUp(`**Autoroles:**\n${roles.map((r) => `<@&${r.roleId}>`).join('\n')}`);
                }
            }
        }
        if (group === 'raid') {
            let config = await prisma.raidProtection.findUnique({ where: { guildId } });
            if (!config)
                config = await prisma.raidProtection.create({ data: { guildId } });
            if (subCommand === 'enable' || subCommand === 'disable') {
                const enabled = subCommand === 'enable';
                await prisma.raidProtection.update({ where: { guildId }, data: { enabled } });
                await interaction.followUp(`✅ Successfully ${enabled ? 'enabled' : 'disabled'} raid protection.`);
            }
            if (subCommand === 'set') {
                const threshold = interaction.options.getInteger('threshold', true);
                const timeWindow = interaction.options.getInteger('time_window', true);
                const action = interaction.options.getString('action', true);
                await prisma.raidProtection.update({
                    where: { guildId },
                    data: { joinThreshold: threshold, timeWindow, action }
                });
                await interaction.followUp(`✅ Successfully configured raid protection:\nThreshold: **${threshold}** joins\nWindow: **${timeWindow}** seconds\nAction: **${action}**`);
            }
            await CacheService.delete(`raidconfig:${guildId}`);
        }
    },
};
export default command;
