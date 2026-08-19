import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';
import { CacheService } from '../../services/cacheService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('config-automod')
    .setDescription('Configure AutoMod settings for the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('enable')
        .setDescription('Enable a specific AutoMod rule')
        .addStringOption(option => 
          option.setName('rule').setDescription('The rule to enable').setRequired(true)
            .addChoices(
              { name: 'Spam', value: 'Spam' },
              { name: 'Links', value: 'Links' },
              { name: 'BadWords', value: 'BadWords' },
              { name: 'Caps', value: 'Caps' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Disable a specific AutoMod rule')
        .addStringOption(option => 
          option.setName('rule').setDescription('The rule to disable').setRequired(true)
             .addChoices(
              { name: 'Spam', value: 'Spam' },
              { name: 'Links', value: 'Links' },
              { name: 'BadWords', value: 'BadWords' },
              { name: 'Caps', value: 'Caps' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Configure threshold and action for a rule')
        .addStringOption(option => option.setName('rule').setDescription('The rule to configure').setRequired(true).addChoices(
              { name: 'Spam', value: 'Spam' },
              { name: 'Links', value: 'Links' },
              { name: 'BadWords', value: 'BadWords' },
              { name: 'Caps', value: 'Caps' }
        ))
        .addStringOption(option => option.setName('action').setDescription('Action to take').setRequired(true).addChoices(
           { name: 'Log Only', value: 'LOG' },
           { name: 'Delete Message', value: 'DELETE' },
           { name: 'Warn User', value: 'WARN' },
           { name: 'Timeout User', value: 'TIMEOUT' },
           { name: 'Kick User', value: 'KICK' },
           { name: 'Ban User', value: 'BAN' }
        ))
        .addIntegerOption(option => option.setName('threshold').setDescription('Numeric threshold if applicable (e.g., 5 messages for Spam)').setRequired(false))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('rules')
        .setDescription('List all configured AutoMod rules')
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inCachedGuild()) return;
    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    await interaction.deferReply({ ephemeral: true });

    if (subCommand === 'rules') {
      const rules = await prisma.autoModRule.findMany({ where: { guildId } });
      if (rules.length === 0) {
        await interaction.followUp('No AutoMod rules are configured.');
        return;
      }
      
      const text = rules.map((r: any) => `**${r.type}**: ${r.enabled ? '🟢 Enabled' : '🔴 Disabled'} | Action: ${r.action} | Threshold: ${r.threshold}`).join('\n');
      await interaction.followUp(`**AutoMod Rules:**\n${text}`);
      return;
    }

    const ruleType = interaction.options.getString('rule', true);
    const cacheKey = `automod:rules:${guildId}`;

    if (subCommand === 'enable' || subCommand === 'disable') {
      const enabled = subCommand === 'enable';

      let rule = await prisma.autoModRule.findFirst({ where: { guildId, type: ruleType } });
      if (rule) {
        await prisma.autoModRule.update({ where: { id: rule.id }, data: { enabled } });
      } else {
        await prisma.autoModRule.create({ data: { guildId, type: ruleType, enabled, action: 'LOG' } });
      }
      
      await CacheService.delete(cacheKey);
      await interaction.followUp(`✅ Successfully ${enabled ? 'enabled' : 'disabled'} **${ruleType}** AutoMod rule.`);
    }

    if (subCommand === 'set') {
      const action = interaction.options.getString('action', true);
      const threshold = interaction.options.getInteger('threshold') || 1;

      let rule = await prisma.autoModRule.findFirst({ where: { guildId, type: ruleType } });
      if (rule) {
        await prisma.autoModRule.update({ where: { id: rule.id }, data: { action, threshold } });
      } else {
        await prisma.autoModRule.create({ data: { guildId, type: ruleType, enabled: true, action, threshold } });
      }

      await CacheService.delete(cacheKey);
      await interaction.followUp(`✅ Successfully configured **${ruleType}** to perform action **${action}** with threshold **${threshold}**.`);
    }
  },
};

export default command;
