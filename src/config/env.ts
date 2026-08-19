import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  BOT_OWNER_ID: z.string().optional(),
  LAVALINK_HOST: z.string().min(1).optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_OWNER_IDS: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
