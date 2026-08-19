import { Events, Message } from 'discord.js';
import { Event } from '../types/index.js';
import { AutoModEngine } from '../services/automod/AutoModEngine.js';
import { CustomCommandEngine } from '../services/customCommands/CustomCommandEngine.js';
import { LevelingService } from '../services/economy/LevelingService.js';
import { logger } from '../utils/logger.js';

const event: Event<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (message: Message) => {
    try {
      if (message.author.bot) return;

      // 1. Run AutoMod
      await AutoModEngine.handleMessage(message);

      // 2. Run Leveling
      await LevelingService.handleMessage(message);

      // 3. Run Custom Commands
      // Only run custom commands if the message wasn't deleted by AutoMod
      // Wait, since handleMessage is async and might take a moment, 
      // if it deleted the message, message.deletable would be false.
      if (!message.deletable && message.guild?.client.user?.id === message.author.id) {
         // It's the bot's own message, or it's deleted
      } else {
         await CustomCommandEngine.handleMessage(message);
      }
      
    } catch (error) {
      logger.error({ error }, 'Error in messageCreate event');
    }
  },
};

export default event;
