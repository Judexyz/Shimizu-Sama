import {
  Guild,
  TextChannel,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
import { GiveawayScheduler } from './GiveawayScheduler.js';

export class GiveawayService {
  static async createGiveaway(
    guild: Guild,
    channel: TextChannel,
    host: GuildMember,
    prize: string,
    winnerCount: number,
    endsAt: Date,
    requiredRole?: string
  ): Promise<void> {
    const embed = this.buildGiveawayEmbed(prize, host.id, winnerCount, endsAt, 0);

    const joinButton = new ButtonBuilder()
      .setCustomId('giveaway_join')

      .setLabel('Join Giveaway')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);

    const message = await channel.send({ embeds: [embed], components: [row] });

    const giveaway = await prisma.giveaway.create({
      data: {
        guildId: guild.id,
        channelId: channel.id,
        messageId: message.id,
        prize,
        endsAt,
        winnerCount,
        requiredRole,
        hostId: host.id,
        status: 'ACTIVE',
      },
    });

    joinButton.setCustomId(`giveaway_join_${giveaway.id}`);
    const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);
    await message.edit({ components: [newRow] });

    GiveawayScheduler.scheduleGiveaway(giveaway.id, endsAt);
  }

  static async endGiveaway(giveawayId: string, client: any): Promise<void> {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { entries: true },
    });

    if (!giveaway || giveaway.status !== 'ACTIVE') return;

    const result = await prisma.giveaway.updateMany({
      where: { id: giveawayId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    if (result.count === 0) return;

    const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (!guild) return;

    const channel = (await guild.channels
      .fetch(giveaway.channelId)
      .catch(() => null)) as TextChannel | null;
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId!).catch(() => null);

    const winners = await this.pickWinners(
      guild,
      giveaway.entries.map((e) => e.userId),
      giveaway.winnerCount,
      giveaway.requiredRole
    );

    await prisma.giveaway.update({
      where: { id: giveawayId },
      data: { winnersList: winners },
    });

    if (message) {
      const embed = this.buildCompletedEmbed(giveaway, winners);

      await message.edit({ embeds: [embed], components: [] }).catch(() => null);

      if (winners.length > 0) {
        await message
          .reply(
            `Congratulations ${winners.map((w) => `<@${w}>`).join(', ')}! You won the **${giveaway.prize}**! 🎉`
          )
          .catch(() => null);
      } else {
        await message.reply(`No valid entries for **${giveaway.prize}**! 😢`).catch(() => null);
      }
    }
  }

  static async cancelGiveaway(giveawayId: string, client: any): Promise<boolean> {
    const result = await prisma.giveaway.updateMany({
      where: { id: giveawayId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    if (result.count === 0) return false;
    GiveawayScheduler.cancelTimer(giveawayId);

    const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
    if (!giveaway) return false;

    const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (guild) {
      const channel = (await guild.channels
        .fetch(giveaway.channelId)
        .catch(() => null)) as TextChannel | null;
      if (channel && giveaway.messageId) {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const embed = EmbedBuilder.from(message.embeds[0])
            .setTitle('🚫 GIVEAWAY CANCELLED')
            .setColor(0x36393f)
            .setDescription('This giveaway was cancelled by an administrator.');
          await message.edit({ embeds: [embed], components: [] }).catch(() => null);
        }
      }
    }
    return true;
  }

  static async rerollGiveaway(giveawayId: string, client: any): Promise<string[]> {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { entries: true },
    });

    if (!giveaway || giveaway.status !== 'COMPLETED') return [];

    const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (!guild) return [];

    const previousWinners = Array.isArray(giveaway.winnersList)
      ? (giveaway.winnersList as string[])
      : [];

    const entryIds = giveaway.entries
      .map((e) => e.userId)
      .filter((id) => !previousWinners.includes(id));

    const newWinners = await this.pickWinners(
      guild,
      entryIds,
      giveaway.winnerCount,
      giveaway.requiredRole
    );

    await prisma.giveaway.update({
      where: { id: giveawayId },
      data: { winnersList: [...previousWinners, ...newWinners] },
    });

    return newWinners;
  }

  static async handleJoinInteraction(interaction: any): Promise<void> {
    const parts = interaction.customId.split('_');
    const giveawayId = parts[2];

    if (!giveawayId) return;

    await interaction.deferReply({ ephemeral: true });

    const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
    if (!giveaway || giveaway.status !== 'ACTIVE') {
      await interaction.followUp(`❌ This giveaway is no longer active.`);
      return;
    }

    if (giveaway.requiredRole) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member || !member.roles.cache.has(giveaway.requiredRole)) {
        await interaction.followUp(
          `❌ You need the <@&${giveaway.requiredRole}> role to join this giveaway.`
        );
        return;
      }
    }

    try {
      await prisma.giveawayEntry.create({
        data: { giveawayId, userId: interaction.user.id },
      });

      const count = await prisma.giveawayEntry.count({ where: { giveawayId } });
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);

      const desc = embed.data.description;
      if (desc) {
        const newDesc = desc.replace(/👥 \*\*Entries\*\*\n\d+/, `👥 **Entries**\n${count}`);
        embed.setDescription(newDesc);
      }

      await interaction.message.edit({ embeds: [embed] }).catch(() => null);
      await interaction.followUp(`🎉 You have successfully joined the giveaway!`);
    } catch (err: any) {
      if (err.code === 'P2002') {
        await interaction.followUp(`You have already joined this giveaway!`);
      } else {
        await interaction.followUp(`❌ An error occurred while joining.`);
      }
    }
  }

  private static async pickWinners(
    guild: Guild,
    entryUserIds: string[],
    count: number,
    requiredRole: string | null
  ): Promise<string[]> {
    const winners: string[] = [];
    const pool = [...entryUserIds];

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    while (winners.length < count && pool.length > 0) {
      const candidateId = pool.pop()!;
      const member = await guild.members.fetch(candidateId).catch(() => null);

      if (!member) continue;

      if (requiredRole && !member.roles.cache.has(requiredRole)) continue;

      winners.push(candidateId);
    }

    return winners;
  }

  private static buildGiveawayEmbed(
    prize: string,
    hostId: string,
    winners: number,
    endsAt: Date,
    entries: number
  ) {
    const desc = [
      `🎁 **Prize**\n${prize}\n`,
      `👑 **Hosted by**\n<@${hostId}>\n`,
      `🏆 **Winners**\n${winners}\n`,
      `⏰ **Ends**\n<t:${Math.floor(endsAt.getTime() / 1000)}:R>\n`,
      `👥 **Entries**\n${entries}\n`,
      `━━━━━━━━━━━━━━━━━━\n\nGood luck everyone! 🌸`,
    ].join('\n');

    return new EmbedBuilder().setTitle('🎉 GIVEAWAY').setColor(0x0099ff).setDescription(desc);
  }

  private static buildCompletedEmbed(giveaway: any, winners: string[]) {
    const winnerText = winners.length > 0 ? winners.map((w) => `<@${w}>`).join('\n') : 'None';

    const desc = [
      `🎁 **Prize**\n${giveaway.prize}\n`,
      `👑 **Hosted by**\n<@${giveaway.hostId}>\n`,
      `🏆 **Winners**\n${winnerText}\n`,
      `━━━━━━━━━━━━━━━━━━\n\nGiveaway has ended!`,
    ].join('\n');

    return new EmbedBuilder().setTitle('🎉 GIVEAWAY ENDED').setColor(0x36393f).setDescription(desc);
  }
}
