import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { prisma } from '../../database/prisma.js';
import { EconomyService } from '../../services/economy/EconomyService.js';
import { AchievementService } from '../../services/economy/AchievementService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop.')
    .addStringOption((option) =>
      option.setName('item').setDescription('The exact name of the item to buy').setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const itemName = interaction.options.getString('item', true);

    try {
      const item = await prisma.shopItem.findFirst({
        where: {
          guildId: interaction.guildId,
          name: { equals: itemName, mode: 'insensitive' },
        },
      });

      if (!item) {
        await interaction.reply({
          content: 'That item does not exist in the shop.',
          ephemeral: true,
        });
        return;
      }

      const updatedProfile = await EconomyService.purchaseItem(
        interaction.guildId,
        interaction.user.id,
        item.id
      );

      if (item.roleId && interaction.member) {
        const member = interaction.member as GuildMember;
        try {
          await member.roles.add(item.roleId, `Purchased ${item.name} from shop`);
        } catch (roleError) {
          logger.error(
            {
              error: roleError,
              guildId: interaction.guildId,
              userId: interaction.user.id,
              roleId: item.roleId,
            },
            'Failed to assign purchased role'
          );
          await interaction.reply(
            `✅ You successfully bought **${item.name}** for **${item.price} coins**, but I failed to assign the associated role! Please ask an administrator for help.`
          );

          AchievementService.checkEconomyAchievements(
            updatedProfile,
            interaction.channel as any
          ).catch((err) => {
            logger.error(
              { err, guildId: interaction.guildId, userId: interaction.user.id },
              'Failed to check economy achievements for purchase'
            );
          });
          return;
        }
      }

      await interaction.reply(
        `🛍️ You successfully purchased **${item.name}** for **${item.price} coins**!`
      );

      AchievementService.checkEconomyAchievements(updatedProfile, interaction.channel as any).catch(
        (err) => {
          logger.error(
            { err, guildId: interaction.guildId, userId: interaction.user.id },
            'Failed to check economy achievements for purchase'
          );
        }
      );
    } catch (error: any) {
      if (error.message && error.message.includes('Insufficient funds')) {
        await interaction.reply({
          content: 'You do not have enough coins to buy this item.',
          ephemeral: true,
        });
      } else {
        logger.error(
          { error, guildId: interaction.guildId, userId: interaction.user.id },
          'Error in /buy command'
        );
        await interaction.reply({ content: 'Failed to process purchase.', ephemeral: true });
      }
    }
  },
};

export default command;
