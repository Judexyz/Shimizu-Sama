import { Events, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { VariableParser } from '../utils/variables.js';
import { logger } from '../utils/logger.js';
const event = {
    name: Events.GuildMemberRemove,
    execute: async (member) => {
        const guild = member.guild;
        try {
            const config = await prisma.welcomeConfig.findUnique({ where: { guildId: guild.id } });
            if (config?.enabled && config.goodbyeChannelId && config.goodbyeMessage) {
                const channel = await guild.channels.fetch(config.goodbyeChannelId).catch(() => null);
                if (channel && channel instanceof TextChannel) {
                    const context = { user: member.user, member: member, guild, channel };
                    const parsedMessage = VariableParser.parse(config.goodbyeMessage, context);
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `A member has left`, iconURL: member.user.displayAvatarURL() })
                        .setTitle(`Goodbye, ${member.user.username} 🕊️`)
                        .setDescription(parsedMessage)
                        .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
                        .setColor('#2b2d31') // Dark invisible-like color
                        .setFooter({ text: `We are now at ${guild.memberCount} members`, iconURL: guild.iconURL() || undefined })
                        .setTimestamp();
                    await channel.send({ embeds: [embed] }).catch(() => {
                        logger.warn(`Failed to send goodbye message in guild ${guild.id}`);
                    });
                }
            }
        }
        catch (error) {
            logger.error({ error }, `Error processing guildMemberRemove for ${member.id}`);
        }
    },
};
export default event;
