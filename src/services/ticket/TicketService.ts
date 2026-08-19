import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  EmbedBuilder, 
  Guild, 
  GuildMember, 
  Message, 
  TextChannel, 
  User, 
  PermissionFlagsBits,
  ButtonInteraction,
  AttachmentBuilder
} from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

export class TicketService {
  /**
   * Spawn a new ticket panel in the given channel.
   */
  public static async createPanel(guildId: string, channel: TextChannel, title: string = 'Need Support?', description: string = 'To create a ticket use the Create ticket button') {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#2F3136');

    const button = new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Create ticket')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const message = await channel.send({ embeds: [embed], components: [row] });

    await prisma.ticketPanel.create({
      data: {
        guildId,
        channelId: channel.id,
        messageId: message.id,
        title,
        description,
      },
    });

    return message;
  }

  /**
   * Generates a simple HTML transcript of a text channel.
   */
  private static async generateTranscript(channel: TextChannel): Promise<Buffer> {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(messages.values()).reverse();

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Transcript - ${channel.name}</title>
      <style>
        body { font-family: sans-serif; background-color: #36393f; color: #dcddde; padding: 20px; }
        .message { margin-bottom: 20px; display: flex; align-items: flex-start; }
        .avatar { border-radius: 50%; width: 40px; height: 40px; margin-right: 15px; }
        .header { display: flex; align-items: baseline; margin-bottom: 5px; }
        .username { font-weight: bold; color: #fff; margin-right: 10px; font-size: 1.1em; }
        .timestamp { color: #72767d; font-size: 0.8em; }
        .content { white-space: pre-wrap; line-height: 1.4; }
      </style>
    </head>
    <body>
      <h1>Transcript: ${channel.name}</h1>
      <hr style="border: 1px solid #4f545c; margin-bottom: 20px;" />
    `;

    for (const msg of sortedMessages) {
      if (msg.author.bot) continue;
      
      const avatarUrl = msg.author.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
      const time = msg.createdAt.toLocaleString();
      const content = msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      html += `
      <div class="message">
        <img class="avatar" src="${avatarUrl}" alt="avatar" />
        <div>
          <div class="header">
            <span class="username">${msg.author.username}</span>
            <span class="timestamp">${time}</span>
          </div>
          <div class="content">${content}</div>
        </div>
      </div>
      `;
    }

    html += `</body></html>`;
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Closes a ticket, generates transcript, and deletes the channel.
   */
  public static async closeTicket(interaction: ButtonInteraction | any, channel: TextChannel) {
    await interaction.reply({ content: 'Closing ticket in 5 seconds...', ephemeral: false });

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { channelId: channel.id },
      });

      if (ticket) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'CLOSED', closedAt: new Date() },
        });

        // Generate transcript
        const transcriptBuffer = await this.generateTranscript(channel);
        const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${channel.name}.html` });

        const settings = await prisma.ticketSettings.findUnique({
          where: { guildId: channel.guild.id },
        });

        if (settings?.transcriptChannelId) {
          const logChannel = channel.guild.channels.cache.get(settings.transcriptChannelId) as TextChannel;
          if (logChannel) {
            await logChannel.send({
              content: `Transcript for ticket \`${channel.name}\` closed by ${interaction.user.username}`,
              files: [attachment],
            });
          }
        }
      }

      setTimeout(async () => {
        try {
          await channel.delete('Ticket closed');
        } catch (e) {
          logger.error({ e, channelId: channel.id }, 'Failed to delete ticket channel');
        }
      }, 5000);
    } catch (error) {
      logger.error({ error, channelId: channel.id }, 'Error closing ticket');
    }
  }

  /**
   * Opens a new ticket for a user.
   */
  public static async openTicket(interaction: ButtonInteraction) {
    const guild = interaction.guild!;
    const member = interaction.member as GuildMember;

    // Check if user already has an open ticket
    const existingTicket = await prisma.ticket.findFirst({
      where: { guildId: guild.id, creatorId: member.id, status: 'OPEN' },
    });

    if (existingTicket) {
      return interaction.reply({ content: `You already have an open ticket: <#${existingTicket.channelId}>`, ephemeral: true });
    }

    const settings = await prisma.ticketSettings.findUnique({
      where: { guildId: guild.id },
    });

    await interaction.deferReply({ ephemeral: true });

    try {
      const permissionOverwrites: any[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, 
            PermissionFlagsBits.SendMessages, 
            PermissionFlagsBits.ReadMessageHistory, 
            PermissionFlagsBits.ManageChannels
          ],
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel, 
            PermissionFlagsBits.SendMessages, 
            PermissionFlagsBits.ReadMessageHistory
          ],
        },
      ];

      if (settings?.supportRoleId) {
        permissionOverwrites.push({
          id: settings.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: settings?.categoryId || null,
        permissionOverwrites,
      });

      await prisma.ticket.create({
        data: {
          guildId: guild.id,
          channelId: ticketChannel.id,
          creatorId: member.id,
        },
      });

      const embed = new EmbedBuilder()
        .setTitle('Ticket Support')
        .setDescription('Support will be with you shortly.\nTo close this ticket, press the button below.')
        .setColor('#2F3136');

      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close_request')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn);

      const pingMsg = settings?.supportRoleId ? `<@&${settings.supportRoleId}> <@${member.id}>` : `<@${member.id}>`;
      await ticketChannel.send({ content: pingMsg, embeds: [embed], components: [row] });

      await interaction.followUp({ content: `Ticket created: <#${ticketChannel.id}>`, ephemeral: true });
    } catch (error) {
      logger.error({ error, guildId: guild.id }, 'Failed to open ticket');
      await interaction.followUp({ content: 'Failed to create your ticket. Please contact an admin.', ephemeral: true });
    }
  }

  /**
   * Handle button interactions for tickets.
   */
  public static async handleInteraction(interaction: ButtonInteraction) {
    if (interaction.customId === 'ticket_create') {
      await this.openTicket(interaction);
    } else if (interaction.customId === 'ticket_close_request') {
      const confirmBtn = new ButtonBuilder()
        .setCustomId('ticket_close_confirm')
        .setLabel('Confirm Close')
        .setStyle(ButtonStyle.Danger);
      
      const cancelBtn = new ButtonBuilder()
        .setCustomId('ticket_close_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);
      await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [row] });
    } else if (interaction.customId === 'ticket_close_confirm') {
      await this.closeTicket(interaction, interaction.channel as TextChannel);
    } else if (interaction.customId === 'ticket_close_cancel') {
      await interaction.message.delete().catch(() => {});
    }
  }

  public static async addUser(channel: TextChannel, user: User) {
    await channel.permissionOverwrites.create(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
  }

  public static async removeUser(channel: TextChannel, user: User) {
    await channel.permissionOverwrites.delete(user.id);
  }
}
