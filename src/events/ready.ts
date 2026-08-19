import { Events } from 'discord.js';
import { Event } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { GiveawayScheduler } from '../services/giveaway/GiveawayScheduler.js';
import { ServerStatsService } from '../services/serverStats/ServerStatsService.js';
import { ShimizuClient } from '../bot/client.js';

const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: any) => {
    logger.info(`Logged in as ${client.user?.tag}!`);
    await GiveawayScheduler.init(client as ShimizuClient);
    ServerStatsService.init(client as ShimizuClient);
  },
};

export default event;
