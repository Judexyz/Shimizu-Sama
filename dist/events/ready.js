import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { GiveawayScheduler } from '../services/giveaway/GiveawayScheduler.js';
const event = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        logger.info(`Logged in as ${client.user.tag}!`);
        await GiveawayScheduler.init(client);
    },
};
export default event;
