import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../types/index.js';
import { prisma } from '../database/prisma.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('Manage interactive button role panels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new role panel in the current channel')
        .addStringOption(option => option.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Panel description').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add-role')
        .setDescription('Add a role button to a panel')
        .addStringOption(option => option.setName('panel_id').setDescription('The ID of the panel').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role to give').setRequired(true))
        .addStringOption(option => option.setName('label').setDescription('Button label').setRequired(true))
        .addStringOption(option => option.setName('emoji').setDescription('Button emoji').setRequired(false))
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) return;
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    await interaction.deferReply({ ephemeral: true });

    if (subCommand === 'create') {
      const title = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);
      const channel = interaction.channel;

      if (!channel || !(channel instanceof TextChannel)) {
        await interaction.followUp(`❌ Must be used in a text channel.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x2f3136);

      const message = await channel.send({ embeds: [embed] });

      const roleMenu = await prisma.roleMenu.create({
        data: {
          guildId,
          channelId: channel.id,
          messageId: message.id
        }
      });

      await interaction.followUp(`✅ Role panel created successfully. Panel ID: \`${roleMenu.id}\`. Use \`/rolepanel add-role\` to add buttons.`);
    }

    if (subCommand === 'add-role') {
      const panelId = interaction.options.getString('panel_id', true);
      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('label', true);
      const emoji = interaction.options.getString('emoji', false);

      const roleMenu = await prisma.roleMenu.findUnique({
        where: { id: panelId },
        include: { items: true }
      });

      if (!roleMenu || roleMenu.guildId !== guildId) {
        await interaction.followUp(`❌ Panel not found.`);
        return;
      }

      if (roleMenu.items.length >= 25) {
        await interaction.followUp(`❌ Maximum 25 buttons allowed per panel.`);
        return;
      }

      // Add to database
      await prisma.roleMenuItem.create({
        data: {
          roleMenuId: roleMenu.id,
          roleId: role.id,
          label,
          emoji: emoji || null
        }
      });

      // Fetch all items to reconstruct buttons
      const updatedMenu = await prisma.roleMenu.findUnique({
        where: { id: panelId },
        include: { items: true }
      });

      if (!updatedMenu || !updatedMenu.messageId) return;

      const channel = await interaction.guild.channels.fetch(updatedMenu.channelId).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) return;

      const message = await channel.messages.fetch(updatedMenu.messageId).catch(() => null);
      if (!message) {
        await interaction.followUp(`❌ Original panel message was deleted.`);
        return;
      }

      // Reconstruct ActionRows (max 5 rows of 5 buttons)
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let i = 0; i < updatedMenu.items.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const chunk = updatedMenu.items.slice(i, i + 5);
        for (const item of chunk) {
          const btn = new ButtonBuilder()
            .setCustomId(`rolepanel_${updatedMenu.id}_${item.roleId}`)
            .setLabel(item.label)
            .setStyle(ButtonStyle.Primary);
            
          if (item.emoji) btn.setEmoji(item.emoji);
          row.addComponents(btn);
        }
        rows.push(row);
      }

      await message.edit({ components: rows });
      await interaction.followUp(`✅ Button added to panel.`);
    }
  },
};

export default command;
