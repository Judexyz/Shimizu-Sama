import { Events } from 'discord.js';
import { AutoModEngine } from '../services/automod/AutoModEngine.js';
import { logger } from '../utils/logger.js';
const event = {
    name: Events.MessageUpdate,
    execute: async (oldMessage, newMessage) => {
        try {
            if (newMessage.partial) {
                newMessage = await newMessage.fetch().catch(() => newMessage);
            }
            if (newMessage.partial)
                return;
            if (newMessage.author?.bot)
                return;
            // Run AutoMod on edits to catch users bypassing filters by editing
            if (newMessage.content !== oldMessage.content) {
                await AutoModEngine.handleMessage(newMessage);
            }
        }
        catch (error) {
            logger.error({ error }, 'Error in messageUpdate event');
        }
    },
};
export default event;
