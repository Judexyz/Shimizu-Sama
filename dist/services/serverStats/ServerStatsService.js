import { ChannelType, OverwriteType } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
export class ServerStatsService {
    static init(client) {
        setInterval(() => this.updateAllGuilds(client), 10 * 60 * 1000);
        logger.info('ServerStatsService initialized with 10-minute interval.');
    }
    static async updateAllGuilds(client) {
        try {
            const statsConfigs = await prisma.serverStats.findMany();
            for (const config of statsConfigs) {
                const guild = client.guilds.cache.get(config.guildId);
                if (guild) {
                    await this.updateGuildStats(guild, config).catch(() => null);
                }
            }
        }
        catch (err) {
            logger.error({ err }, 'Failed to update all guild server stats.');
        }
    }
    static async setup(guild) {
        try {
            const category = await guild.channels.create({
                name: '┌-⋆⋅📊⋅⋆-┐ 📊 𝑺𝒆𝒓𝒗𝒆𝒓 𝑺𝒕𝒂𝒕𝒔 └-⋆⋅📊⋅⋆-┘',
                type: ChannelType.GuildCategory,
                position: 0,
            });
            const memberCount = guild.memberCount;
            const botCount = guild.members.cache.filter((m) => m.user.bot).size;
            const userCount = memberCount - botCount;
            const basePermissions = [
                {
                    id: guild.id,
                    deny: ['Connect'],
                    type: OverwriteType.Role,
                },
                {
                    id: guild.client.user.id,
                    allow: ['Connect', 'ViewChannel', 'ManageChannels'],
                    type: OverwriteType.Member,
                },
            ];
            const allMembersChannel = await guild.channels.create({
                name: `╰----➤- 👥 All members: ${memberCount}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: basePermissions,
            });
            const membersChannel = await guild.channels.create({
                name: `╰----➤- 👤 Members: ${userCount}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: basePermissions,
            });
            const botsChannel = await guild.channels.create({
                name: `╰----➤- 🤖 Bots: ${botCount}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: basePermissions,
            });
            await prisma.serverStats.upsert({
                where: { guildId: guild.id },
                update: {
                    categoryId: category.id,
                    allMembersId: allMembersChannel.id,
                    membersId: membersChannel.id,
                    botsId: botsChannel.id,
                },
                create: {
                    guildId: guild.id,
                    categoryId: category.id,
                    allMembersId: allMembersChannel.id,
                    membersId: membersChannel.id,
                    botsId: botsChannel.id,
                },
            });
            return true;
        }
        catch (error) {
            logger.error({ error }, 'Failed to setup server stats');
            return false;
        }
    }
    static async updateGuildStats(guild, config) {
        if (!config) {
            config = await prisma.serverStats.findUnique({ where: { guildId: guild.id } });
            if (!config)
                return;
        }
        try {
            await guild.members.fetch();
            const memberCount = guild.memberCount;
            const botCount = guild.members.cache.filter((m) => m.user.bot).size;
            const userCount = memberCount - botCount;
            if (config.allMembersId) {
                const ch = guild.channels.cache.get(config.allMembersId);
                if (ch && ch.name !== `╰----➤- 👥 All members: ${memberCount}`) {
                    await ch.setName(`╰----➤- 👥 All members: ${memberCount}`).catch(() => null);
                }
            }
            if (config.membersId) {
                const ch = guild.channels.cache.get(config.membersId);
                if (ch && ch.name !== `╰----➤- 👤 Members: ${userCount}`) {
                    await ch.setName(`╰----➤- 👤 Members: ${userCount}`).catch(() => null);
                }
            }
            if (config.botsId) {
                const ch = guild.channels.cache.get(config.botsId);
                if (ch && ch.name !== `╰----➤- 🤖 Bots: ${botCount}`) {
                    await ch.setName(`╰----➤- 🤖 Bots: ${botCount}`).catch(() => null);
                }
            }
        }
        catch (err) {
            logger.error({ err }, 'Failed to update guild server stats.');
        }
    }
    static async remove(guild) {
        const config = await prisma.serverStats.findUnique({ where: { guildId: guild.id } });
        if (!config)
            return false;
        try {
            if (config.allMembersId)
                await guild.channels.cache
                    .get(config.allMembersId)
                    ?.delete()
                    .catch(() => null);
            if (config.membersId)
                await guild.channels.cache
                    .get(config.membersId)
                    ?.delete()
                    .catch(() => null);
            if (config.botsId)
                await guild.channels.cache
                    .get(config.botsId)
                    ?.delete()
                    .catch(() => null);
            if (config.categoryId)
                await guild.channels.cache
                    .get(config.categoryId)
                    ?.delete()
                    .catch(() => null);
            await prisma.serverStats.delete({ where: { guildId: guild.id } });
            return true;
        }
        catch (err) {
            return false;
        }
    }
}
