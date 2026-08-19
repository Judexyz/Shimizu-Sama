import { SlashCommandBuilder, PermissionFlagsBits, TextChannel, EmbedBuilder, } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { GiveawayService } from '../services/giveaway/GiveawayService.js';
import { DurationParser } from '../utils/durationParser.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage persistent giveaways.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) => sub
        .setName('create')
        .setDescription('Start a new giveaway')
        .addStringOption((opt) => opt.setName('prize').setDescription('The prize').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('e.g., 30s, 10m, 2h, 7d, 1w').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Number of winners (default: 1)').setRequired(false))
        .addRoleOption((opt) => opt.setName('required_role').setDescription('Role required to enter').setRequired(false)))
        .addSubcommand((sub) => sub
        .setName('end')
        .setDescription('Immediately end an active giveaway')
        .addStringOption((opt) => opt
        .setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName('cancel')
        .setDescription('Cancel an active giveaway without picking winners')
        .addStringOption((opt) => opt
        .setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName('reroll')
        .setDescription('Pick new winners for a completed giveaway')
        .addStringOption((opt) => opt
        .setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true)))
        .addSubcommand((sub) => sub.setName('list').setDescription('List all active giveaways')),
    execute: async (interaction) => {
        if (!interaction.inCachedGuild())
            return;
        const subCommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const channel = interaction.channel;
        if (!channel || !(channel instanceof TextChannel)) {
            await interaction.reply({
                content: '❌ Giveaways must be managed in a text channel.',
                ephemeral: true,
            });
            return;
        }
        if (subCommand === 'create') {
            const prize = interaction.options.getString('prize', true);
            const durationStr = interaction.options.getString('duration', true);
            const winners = interaction.options.getInteger('winners') || 1;
            const role = interaction.options.getRole('required_role');
            const durationMs = DurationParser.parse(durationStr);
            if (!durationMs) {
                await interaction.reply({
                    content: '❌ Invalid duration format. Use 30s, 10m, 2h, 7d, or 1w.',
                    ephemeral: true,
                });
                return;
            }
            await interaction.reply({ content: '✅ Starting giveaway...', ephemeral: true });
            const endsAt = new Date(Date.now() + durationMs);
            await GiveawayService.createGiveaway(guild, channel, interaction.member, prize, winners, endsAt, role?.id);
        }
        if (subCommand === 'end') {
            const messageId = interaction.options.getString('message_id', true);
            const giveaway = await prisma.giveaway.findFirst({ where: { messageId, guildId: guild.id } });
            if (!giveaway || giveaway.status !== 'ACTIVE') {
                await interaction.reply({
                    content: '❌ Active giveaway not found with that message ID.',
                    ephemeral: true,
                });
                return;
            }
            await interaction.reply({ content: '✅ Ending giveaway...', ephemeral: true });
            await GiveawayService.endGiveaway(giveaway.id, interaction.client);
        }
        if (subCommand === 'cancel') {
            const messageId = interaction.options.getString('message_id', true);
            const giveaway = await prisma.giveaway.findFirst({ where: { messageId, guildId: guild.id } });
            if (!giveaway || giveaway.status !== 'ACTIVE') {
                await interaction.reply({
                    content: '❌ Active giveaway not found with that message ID.',
                    ephemeral: true,
                });
                return;
            }
            await interaction.reply({ content: '✅ Cancelling giveaway...', ephemeral: true });
            const success = await GiveawayService.cancelGiveaway(giveaway.id, interaction.client);
            if (success) {
                await interaction.followUp({
                    content: '✅ Giveaway cancelled successfully.',
                    ephemeral: true,
                });
            }
        }
        if (subCommand === 'reroll') {
            const messageId = interaction.options.getString('message_id', true);
            const giveaway = await prisma.giveaway.findFirst({ where: { messageId, guildId: guild.id } });
            if (!giveaway || giveaway.status !== 'COMPLETED') {
                await interaction.reply({
                    content: '❌ Completed giveaway not found with that message ID.',
                    ephemeral: true,
                });
                return;
            }
            await interaction.deferReply({ ephemeral: false });
            const newWinners = await GiveawayService.rerollGiveaway(giveaway.id, interaction.client);
            if (newWinners.length > 0) {
                await interaction.followUp(`🎉 New giveaway winner(s): ${newWinners.map((w) => `<@${w}>`).join(', ')}! Congratulations!`);
            }
            else {
                await interaction.followUp(`❌ Could not pick any new valid winners.`);
            }
        }
        if (subCommand === 'list') {
            const activeGiveaways = await prisma.giveaway.findMany({
                where: { guildId: guild.id, status: 'ACTIVE' },
            });
            if (activeGiveaways.length === 0) {
                await interaction.reply({ content: 'No active giveaways.', ephemeral: true });
                return;
            }
            const embed = new EmbedBuilder()
                .setTitle('Active Giveaways')
                .setColor(0x0099ff)
                .setDescription(activeGiveaways
                .map((g) => `**${g.prize}** in <#${g.channelId}>\nEnds: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R> | Message ID: \`${g.messageId}\``)
                .join('\n\n'));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
export default command;
