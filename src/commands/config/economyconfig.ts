import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('economyconfig')
    .setDescription('Configure economy and leveling settings for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    // Leveling Enable/Disable
    .addSubcommand(sub => 
      sub.setName('leveling')
        .setDescription('Enable or disable the leveling system')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable leveling').setRequired(true))
    )
    
    // Economy Enable/Disable
    .addSubcommand(sub => 
      sub.setName('economy')
        .setDescription('Enable or disable the economy system')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable economy').setRequired(true))
    )
    
    // Level Up Settings
    .addSubcommand(sub => 
      sub.setName('levelup-channel')
        .setDescription('Set the channel for level-up messages')
        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send messages to').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('levelup-message')
        .setDescription('Set the level-up message format')
        .addStringOption(opt => opt.setName('message').setDescription('Message format (use {user}, {level}, {xp})').setRequired(true))
    )
    
    // Level Rewards
    .addSubcommandGroup(group => 
      group.setName('reward')
        .setDescription('Manage level-up role rewards')
        .addSubcommand(sub => 
          sub.setName('add')
            .setDescription('Add a role reward for a level')
            .addIntegerOption(opt => opt.setName('level').setDescription('The level required').setRequired(true).setMinValue(1))
            .addRoleOption(opt => opt.setName('role').setDescription('The role to grant').setRequired(true))
        )
        .addSubcommand(sub => 
          sub.setName('remove')
            .setDescription('Remove a role reward for a level')
            .addIntegerOption(opt => opt.setName('level').setDescription('The level to remove').setRequired(true).setMinValue(1))
        )
    )
    
    // Shop
    .addSubcommandGroup(group => 
      group.setName('shop')
        .setDescription('Manage shop items')
        .addSubcommand(sub => 
          sub.setName('add')
            .setDescription('Add an item to the shop')
            .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Item price').setRequired(true).setMinValue(1))
            .addStringOption(opt => opt.setName('description').setDescription('Item description').setRequired(false))
            .addRoleOption(opt => opt.setName('role').setDescription('Optional role to grant on purchase').setRequired(false))
        )
        .addSubcommand(sub => 
          sub.setName('remove')
            .setDescription('Remove an item from the shop')
            .addStringOption(opt => opt.setName('name').setDescription('Exact item name').setRequired(true))
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) return;

    const subCommand = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup();

    try {
      if (group === 'reward') {
        const level = interaction.options.getInteger('level', true);
        if (subCommand === 'add') {
          const role = interaction.options.getRole('role', true);
          await prisma.levelReward.upsert({
            where: { guildId_level: { guildId: interaction.guildId, level } },
            update: { roleId: role.id },
            create: { guildId: interaction.guildId, level, roleId: role.id },
          });
          await interaction.reply({ content: `✅ Set reward for reaching **Level ${level}** to <@&${role.id}>.` });
        } else if (subCommand === 'remove') {
          await prisma.levelReward.deleteMany({
            where: { guildId: interaction.guildId, level },
          });
          await interaction.reply({ content: `✅ Removed reward for **Level ${level}**.` });
        }
        return;
      }

      if (group === 'shop') {
        const name = interaction.options.getString('name', true);
        if (subCommand === 'add') {
          const price = interaction.options.getInteger('price', true);
          const description = interaction.options.getString('description');
          const role = interaction.options.getRole('role');
          await prisma.shopItem.create({
            data: {
              guildId: interaction.guildId,
              name,
              price,
              description,
              roleId: role?.id,
            },
          });
          await interaction.reply({ content: `✅ Added **${name}** to the shop for **${price} coins**.` });
        } else if (subCommand === 'remove') {
          await prisma.shopItem.deleteMany({
            where: { guildId: interaction.guildId, name },
          });
          await interaction.reply({ content: `✅ Removed **${name}** from the shop.` });
        }
        return;
      }

      // Base settings
      const settings = await prisma.guildSettings.upsert({
        where: { guildId: interaction.guildId },
        update: {},
        create: { guildId: interaction.guildId },
      });

      if (subCommand === 'leveling') {
        const enabled = interaction.options.getBoolean('enabled', true);
        await prisma.guildSettings.update({ where: { id: settings.id }, data: { levelingEnabled: enabled } });
        await interaction.reply({ content: `✅ Leveling system is now **${enabled ? 'enabled' : 'disabled'}**.` });
      } else if (subCommand === 'economy') {
        const enabled = interaction.options.getBoolean('enabled', true);
        await prisma.guildSettings.update({ where: { id: settings.id }, data: { economyEnabled: enabled } });
        await interaction.reply({ content: `✅ Economy system is now **${enabled ? 'enabled' : 'disabled'}**.` });
      } else if (subCommand === 'levelup-channel') {
        const channel = interaction.options.getChannel('channel', true);
        await prisma.guildSettings.update({ where: { id: settings.id }, data: { levelUpChannelId: channel.id } });
        await interaction.reply({ content: `✅ Level-up messages will now be sent in <#${channel.id}>.` });
      } else if (subCommand === 'levelup-message') {
        const message = interaction.options.getString('message', true);
        await prisma.guildSettings.update({ where: { id: settings.id }, data: { levelUpMessage: message } });
        await interaction.reply({ content: `✅ Level-up message updated to:\n${message}` });
      }

    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, 'Error in /economyconfig command');
      await interaction.reply({ content: 'An error occurred while updating settings.', ephemeral: true });
    }
  },
};

export default command;
