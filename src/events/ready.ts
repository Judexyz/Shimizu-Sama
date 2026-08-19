import { Events } from 'discord.js';
import { Event } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { GiveawayScheduler } from '../services/giveaway/GiveawayScheduler.js';

const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    logger.info(`Logged in as ${client.user.tag}!`);
    await GiveawayScheduler.init(client);
  },
};

export default event;
