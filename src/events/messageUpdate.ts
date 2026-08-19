import { Events, Message, PartialMessage } from 'discord.js';
import { Event } from '../types/index.js';
import { AutoModEngine } from '../services/automod/AutoModEngine.js';
import { logger } from '../utils/logger.js';

const event: Event<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  execute: async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    try {
      if (newMessage.partial) {
        newMessage = await newMessage.fetch().catch(() => newMessage);
      }
      if (newMessage.partial) return;

      if (newMessage.author?.bot) return;

      if (newMessage.content !== oldMessage.content) {
        await AutoModEngine.handleMessage(newMessage as Message);
      }
    } catch (error) {
      logger.error({ error }, 'Error in messageUpdate event');
    }
  },
};

export default event;
