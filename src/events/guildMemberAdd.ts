import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { Event } from '../types/index.js';
import { prisma } from '../database/prisma.js';
import { VariableParser, VariableContext } from '../utils/variables.js';
import { RaidProtectionService } from '../services/automod/RaidProtectionService.js';
import { logger } from '../utils/logger.js';
import { LoggingService, LogType } from '../services/loggingService.js';

const event: Event<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  execute: async (member: GuildMember) => {
    const guild = member.guild;

    try {
      // 1. Raid Protection Check
      const raidAction = await RaidProtectionService.handleJoin(member);
      if (raidAction === 'KICK') return; // User was kicked, skip welcome
      if (raidAction === 'BAN') return; // User was banned, skip welcome

      // 2. Autoroles
      const autoroles = await prisma.autorole.findMany({ where: { guildId: guild.id } });
      if (autoroles.length > 0) {
        const rolesToAdd = autoroles.map((ar: any) => ar.roleId);
        try {
          await member.roles.add(rolesToAdd);
        } catch (err) {
          // Log autorole failure
          const embed = new EmbedBuilder()
            .setTitle('Autorole Failed')
            .setColor(0xff0000)
            .setDescription(`Failed to give autoroles to **${member.user.tag}**. Please check my role hierarchy and permissions.`);
          await LoggingService.logAction(guild, LogType.SERVER, embed);
        }
      }

      // 3. Welcome Message
      const welcomeConfig = await prisma.welcomeConfig.findUnique({ where: { guildId: guild.id } });
      if (welcomeConfig?.enabled && welcomeConfig.channelId && welcomeConfig.message) {
        const channel = await guild.channels.fetch(welcomeConfig.channelId).catch(() => null);
        if (channel && channel instanceof TextChannel) {
          const context: VariableContext = { user: member.user, member, guild, channel };
          const parsedMessage = VariableParser.parse(welcomeConfig.message, context);
          
          const embed = new EmbedBuilder()
            .setAuthor({ name: `A new member has joined!`, iconURL: member.user.displayAvatarURL() })
            .setTitle(`Welcome to ${guild.name}! ✨`)
            .setDescription(parsedMessage)
            .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
            .setColor('#ffb6c1') // Pastel pink
            .setFooter({ text: `You are our ${guild.memberCount}th member!`, iconURL: guild.iconURL() || undefined })
            .setTimestamp();

          await channel.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => {
            logger.warn(`Failed to send welcome message in guild ${guild.id}`);
          });
        }
      }

    } catch (error) {
      logger.error({ error }, `Error processing guildMemberAdd for ${member.id}`);
    }
  },
};

export default event;
