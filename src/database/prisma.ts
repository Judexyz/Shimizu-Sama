import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const connectionString = env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e: import('@prisma/client').Prisma.QueryEvent) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
});

prisma.$on('info', (e: import('@prisma/client').Prisma.LogEvent) => {
  logger.info({ message: e.message }, 'Prisma Info');
});

prisma.$on('warn', (e: import('@prisma/client').Prisma.LogEvent) => {
  logger.warn({ message: e.message }, 'Prisma Warn');
});

prisma.$on('error', (e: import('@prisma/client').Prisma.LogEvent) => {
  logger.error({ message: e.message }, 'Prisma Error');
});
