import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './database/prisma.js';
import { ShimizuClient } from './bot/client.js';
import { loadCommands } from './bot/commandRouter.js';
import { loadEvents } from './bot/eventLoader.js';

import { musicService } from './services/music/MusicService.js';
import { startDashboardServer } from './dashboard/server.js';

const bootstrap = async () => {
  logger.info('Initializing Shimizu-sama...');

  const client = new ShimizuClient();

  await loadEvents(client);
  await loadCommands(client);

  musicService.init(client);
  await client.start(env.DISCORD_TOKEN);

  startDashboardServer(client);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    client.destroy();

    await prisma.$disconnect();

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception');
  });

  process.on('unhandledRejection', (error) => {
    logger.error({ err: error }, 'Unhandled Rejection');
  });
};

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Fatal error during bootstrap');

  process.exit(1);
});
