import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { CacheService } from '../services/cacheService.js';
const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-shimizu-key';
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';
export const startDashboardServer = (client) => {
    // Authentication Redirect
    app.get('/api/auth/login', (req, res) => {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
        res.redirect(url);
    });
    // OAuth2 Callback
    app.get('/api/auth/callback', async (req, res) => {
        const code = req.query.code;
        if (!code)
            return res.status(400).send('No code provided');
        try {
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret: process.env.DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const tokenData = await tokenResponse.json();
            if (!tokenData.access_token) {
                throw new Error('Failed to fetch access token');
            }
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const userData = await userResponse.json();
            const token = jwt.sign({ id: userData.id, username: userData.username, avatar: userData.avatar, access_token: tokenData.access_token }, JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
            res.redirect('http://localhost:5173/dashboard');
        }
        catch (error) {
            logger.error({ error }, 'OAuth2 error');
            res.redirect('http://localhost:5173/?error=auth_failed');
        }
    });
    // Middleware to protect routes
    const requireAuth = (req, res, next) => {
        const token = req.cookies.token;
        if (!token)
            return res.status(401).json({ error: 'Unauthorized' });
        try {
            req.user = jwt.verify(token, JWT_SECRET);
            next();
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };
    // Get user profile
    app.get('/api/users/@me', requireAuth, (req, res) => {
        const isBotOwner = req.user.id === env.BOT_OWNER_ID;
        res.json({ id: req.user.id, username: req.user.username, avatar: req.user.avatar, isBotOwner });
    });
    // Get mutual guilds where user has MANAGE_GUILD
    app.get('/api/guilds', requireAuth, async (req, res) => {
        try {
            const isBotOwner = req.user.id === env.BOT_OWNER_ID;
            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.user.access_token}` },
            });
            const guilds = await guildsResponse.json();
            if (!Array.isArray(guilds)) {
                return res.status(500).json({ error: 'Failed to fetch guilds from Discord' });
            }
            const MANAGE_GUILD = 0x20;
            let manageableGuilds = guilds;
            if (!isBotOwner) {
                manageableGuilds = guilds.filter((g) => (parseInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD);
            }
            // If Bot Owner, they can manage ALL guilds the bot is in
            const finalGuilds = isBotOwner
                ? client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL() }))
                : manageableGuilds
                    .filter((g) => client.guilds.cache.has(g.id))
                    .map((g) => ({
                    id: g.id,
                    name: g.name,
                    icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
                }));
            res.json(finalGuilds);
        }
        catch (error) {
            logger.error({ error }, 'Failed to fetch guilds');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    // Get settings for a specific guild
    app.get('/api/guilds/:id/settings', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        if (!client.guilds.cache.has(guildId))
            return res.status(404).json({ error: 'Guild not found' });
        // Validate authorization (User has Manage Guild or is Bot Owner)
        const isBotOwner = req.user.id === env.BOT_OWNER_ID;
        if (!isBotOwner) {
            try {
                const member = await client.guilds.cache.get(guildId)?.members.fetch(req.user.id);
                if (!member?.permissions.has('ManageGuild')) {
                    return res.status(403).json({ error: 'Missing Permissions' });
                }
            }
            catch (e) {
                return res.status(403).json({ error: 'Access Denied' });
            }
        }
        try {
            const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
            const ticketSettings = await prisma.ticketSettings.findUnique({ where: { guildId } });
            const dbSettings = settings || { levelingEnabled: true, economyEnabled: true, levelUpChannelId: null, levelUpMessage: null, prefix: 's!' };
            const dbTicketSettings = ticketSettings || { categoryId: null, supportRoleId: null, transcriptChannelId: null };
            const guild = client.guilds.cache.get(guildId);
            const channels = guild?.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId })) || [];
            const roles = guild?.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color })) || [];
            // Calculate some basic stats
            const memberCount = guild?.memberCount || 0;
            const openTickets = await prisma.ticket.count({ where: { guildId, status: 'OPEN' } });
            const usersWithCoins = await prisma.userGuildProfile.aggregate({
                where: { guildId },
                _sum: { balance: true }
            });
            const totalCoins = usersWithCoins._sum.balance || 0;
            res.json({
                settings: dbSettings,
                ticketSettings: dbTicketSettings,
                stats: { memberCount, openTickets, totalCoins },
                channels,
                roles
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    // Update settings for a specific guild
    app.post('/api/guilds/:id/settings', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        // Validate authorization
        const isBotOwner = req.user.id === env.BOT_OWNER_ID;
        if (!isBotOwner) {
            try {
                const member = await client.guilds.cache.get(guildId)?.members.fetch(req.user.id);
                if (!member?.permissions.has('ManageGuild')) {
                    return res.status(403).json({ error: 'Missing Permissions' });
                }
            }
            catch (e) {
                return res.status(403).json({ error: 'Access Denied' });
            }
        }
        const { levelingEnabled, economyEnabled, levelUpChannelId, levelUpMessage, prefix, categoryId, supportRoleId, transcriptChannelId } = req.body;
        try {
            const updatedSettings = await prisma.guildSettings.upsert({
                where: { guildId },
                update: { levelingEnabled, economyEnabled, levelUpChannelId, levelUpMessage, prefix },
                create: { guildId, levelingEnabled, economyEnabled, levelUpChannelId, levelUpMessage, prefix },
            });
            const updatedTicketSettings = await prisma.ticketSettings.upsert({
                where: { guildId },
                update: { categoryId, supportRoleId, transcriptChannelId },
                create: { guildId, categoryId, supportRoleId, transcriptChannelId },
            });
            res.json({ settings: updatedSettings, ticketSettings: updatedTicketSettings });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update settings' });
        }
    });
    // Get Custom Commands
    app.get('/api/guilds/:id/custom-commands', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        try {
            const commands = await prisma.customCommand.findMany({ where: { guildId } });
            res.json(commands);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch custom commands' });
        }
    });
    // Create Custom Command
    app.post('/api/guilds/:id/custom-commands', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        const { trigger, response } = req.body;
        try {
            const cmd = await prisma.customCommand.create({
                data: { guildId, trigger, response }
            });
            await CacheService.delete(`customcommands:${guildId}`);
            res.json(cmd);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create command' });
        }
    });
    // Update Custom Command
    app.put('/api/guilds/:id/custom-commands/:cmdId', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        const { trigger, response } = req.body;
        try {
            const cmd = await prisma.customCommand.update({
                where: { id: req.params.cmdId },
                data: { trigger, response }
            });
            await CacheService.delete(`customcommands:${guildId}`);
            res.json(cmd);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update command' });
        }
    });
    // Delete Custom Command
    app.delete('/api/guilds/:id/custom-commands/:cmdId', requireAuth, async (req, res) => {
        try {
            const guildId = req.params.id;
            await prisma.customCommand.delete({ where: { id: req.params.cmdId } });
            await CacheService.delete(`customcommands:${guildId}`);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete command' });
        }
    });
    // Get Moderation Settings (Log channels & AutoMod Rules)
    app.get('/api/guilds/:id/moderation', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        try {
            const logConfig = await prisma.logConfig.findUnique({ where: { guildId } });
            const autoModRules = await prisma.autoModRule.findMany({ where: { guildId } });
            const dbLogConfig = logConfig || { moderationLogs: null, messageLogs: null, memberLogs: null };
            res.json({ logConfig: dbLogConfig, autoModRules });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch moderation settings' });
        }
    });
    // Update Moderation Settings
    app.post('/api/guilds/:id/moderation', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        const { logConfig, autoModRules } = req.body;
        try {
            // Update Log Config
            const updatedLogs = await prisma.logConfig.upsert({
                where: { guildId },
                update: logConfig,
                create: { guildId, ...logConfig }
            });
            // Update AutoMod Rules (Wipe and recreate for simplicity)
            await prisma.autoModRule.deleteMany({ where: { guildId } });
            if (autoModRules && autoModRules.length > 0) {
                await prisma.autoModRule.createMany({
                    data: autoModRules.map((r) => ({
                        guildId,
                        type: r.type,
                        action: r.action,
                        enabled: r.enabled,
                        data: r.data || null
                    }))
                });
            }
            const newRules = await prisma.autoModRule.findMany({ where: { guildId } });
            await CacheService.delete(`automod:rules:${guildId}`);
            res.json({ logConfig: updatedLogs, autoModRules: newRules });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update moderation settings' });
        }
    });
    // Get Welcome Config
    app.get('/api/guilds/:id/welcome', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        try {
            const config = await prisma.welcomeConfig.findUnique({ where: { guildId } });
            const dbConfig = config || { enabled: false, channelId: null, message: '', goodbyeChannelId: null, goodbyeMessage: '' };
            res.json(dbConfig);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch welcome settings' });
        }
    });
    // Update Welcome Config
    app.post('/api/guilds/:id/welcome', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        const { enabled, channelId, message, goodbyeChannelId, goodbyeMessage } = req.body;
        try {
            const config = await prisma.welcomeConfig.upsert({
                where: { guildId },
                update: { enabled, channelId, message, goodbyeChannelId, goodbyeMessage },
                create: { guildId, enabled, channelId, message, goodbyeChannelId, goodbyeMessage }
            });
            res.json(config);
        }
        catch (error) {
            logger.error({ error }, 'Welcome settings update failed');
            res.status(500).json({ error: 'Failed to update welcome settings' });
        }
    });
    // Get Role Menus
    app.get('/api/guilds/:id/role-menus', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        try {
            const menus = await prisma.roleMenu.findMany({
                where: { guildId },
                include: { items: true }
            });
            res.json(menus);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch role menus' });
        }
    });
    // Create Role Menu
    app.post('/api/guilds/:id/role-menus', requireAuth, async (req, res) => {
        const guildId = req.params.id;
        const { channelId, title, description, roles } = req.body;
        // roles is array of { roleId, label, emoji }
        if (!roles || roles.length === 0 || roles.length > 5) {
            return res.status(400).json({ error: 'Must provide between 1 and 5 roles.' });
        }
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild)
                return res.status(404).json({ error: 'Guild not found' });
            const channel = guild.channels.cache.get(channelId);
            if (!channel || !(channel instanceof TextChannel)) {
                return res.status(400).json({ error: 'Invalid Text Channel' });
            }
            // We need a temporary ID for the components' customId
            // because we haven't saved to Prisma yet to get the real UUID.
            // But we can generate a temporary uuid, or just save the DB record first without messageId,
            // then update it! Yes!
            const roleMenu = await prisma.roleMenu.create({
                data: {
                    guildId,
                    channelId,
                    items: {
                        create: roles.map((r) => ({
                            roleId: r.roleId,
                            label: r.label,
                            emoji: r.emoji || null
                        }))
                    }
                },
                include: { items: true }
            });
            // Construct Discord Message
            const embed = new EmbedBuilder()
                .setTitle(title || 'Role Selection')
                .setDescription(description || 'Click the buttons below to receive the corresponding role!')
                .setColor(0x5865F2);
            const actionRow = new ActionRowBuilder();
            // We will map the buttons. customId = "rolepanel_menuId_roleId"
            for (const item of roleMenu.items) {
                const btn = new ButtonBuilder()
                    .setCustomId(`rolepanel_${roleMenu.id}_${item.roleId}`)
                    .setLabel(item.label)
                    .setStyle(ButtonStyle.Primary);
                if (item.emoji) {
                    btn.setEmoji(item.emoji);
                }
                actionRow.addComponents(btn);
            }
            const msg = await channel.send({ embeds: [embed], components: [actionRow] });
            // Update the DB with the real messageId
            const updatedMenu = await prisma.roleMenu.update({
                where: { id: roleMenu.id },
                data: { messageId: msg.id },
                include: { items: true }
            });
            res.json(updatedMenu);
        }
        catch (error) {
            logger.error({ error }, 'Failed to create role menu');
            res.status(500).json({ error: 'Failed to create role menu' });
        }
    });
    // Global Error Handler
    app.use((err, req, res, next) => {
        logger.error({ err }, 'Express unhandled error');
        res.status(500).json({ error: 'Internal Server Error' });
    });
    app.listen(3000, () => {
        logger.info('Dashboard API listening on http://localhost:3000');
    });
};
