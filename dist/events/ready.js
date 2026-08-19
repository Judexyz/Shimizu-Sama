import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { GiveawayScheduler } from '../services/giveaway/GiveawayScheduler.js';
import { ServerStatsService } from '../services/serverStats/ServerStatsService.js';
const event = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        logger.info(`Logged in as ${client.user?.tag}!`);
        await GiveawayScheduler.init(client);
        ServerStatsService.init(client);
    },
};
export default event;
