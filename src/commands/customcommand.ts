import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command } from '../types/index.js';
import { prisma } from '../database/prisma.js';
import { CacheService } from '../services/cacheService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage custom text commands.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new custom command')
        .addStringOption(option => option.setName('trigger').setDescription('The exact text to trigger the command').setRequired(true))
        .addStringOption(option => option.setName('response').setDescription('The response text (supports {user}, {server}, etc.)').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a custom command')
        .addStringOption(option => option.setName('trigger').setDescription('The trigger of the command to remove').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all custom commands')
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) return;
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const cacheKey = `customcommands:${guildId}`;

    await interaction.deferReply({ ephemeral: true });

    if (subCommand === 'add') {
      const trigger = interaction.options.getString('trigger', true).toLowerCase();
      const response = interaction.options.getString('response', true);

      const existing = await prisma.customCommand.findFirst({ where: { guildId, trigger } });
      if (existing) {
        await prisma.customCommand.update({ where: { id: existing.id }, data: { response } });
      } else {
        await prisma.customCommand.create({ data: { guildId, trigger, response } });
      }

      await CacheService.delete(cacheKey);
      await interaction.followUp(`✅ Custom command **${trigger}** successfully added/updated.`);
    }

    if (subCommand === 'remove') {
      const trigger = interaction.options.getString('trigger', true).toLowerCase();

      const existing = await prisma.customCommand.findFirst({ where: { guildId, trigger } });
      if (!existing) {
        await interaction.followUp(`❌ Custom command **${trigger}** not found.`);
        return;
      }

      await prisma.customCommand.delete({ where: { id: existing.id } });
      await CacheService.delete(cacheKey);
      await interaction.followUp(`✅ Custom command **${trigger}** successfully removed.`);
    }

    if (subCommand === 'list') {
      const commands = await prisma.customCommand.findMany({ where: { guildId } });
      if (commands.length === 0) {
        await interaction.followUp(`No custom commands are configured.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Custom Commands')
        .setColor(0x0099ff)
        .setDescription(commands.map((c: any) => `**${c.trigger}**\n↳ \`${c.response}\``).join('\n\n'));

      await interaction.followUp({ embeds: [embed] });
    }
  },
};

export default command;
