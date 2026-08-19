import { REST, Routes } from 'discord.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'Missing DISCORD_TOKEN'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Missing DISCORD_CLIENT_ID'),
  DISCORD_GUILD_ID: z.string().min(1, 'Missing DISCORD_GUILD_ID'),
});

const envParsed = envSchema.safeParse(process.env);
if (!envParsed.success) {
  console.error('❌ Environment validation failed:', envParsed.error.format());
  process.exit(1);
}

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = envParsed.data;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, '../src/commands');

const commands: any[] = [];

// Helper function to read commands the same way commandRouter.ts does
async function loadCommands() {
  if (!fs.existsSync(commandsPath)) {
    console.warn('Commands directory does not exist.');
    return;
  }

  const items = fs.readdirSync(commandsPath);

  // commandRouter.ts only reads subdirectories for commands
  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    if (!fs.statSync(itemPath).isDirectory()) {
        // We will also load top level files just in case
        if (item.endsWith('.ts') || item.endsWith('.js')) {
            try {
                const module = await import(`file://${itemPath}`);
                const command = module.default;
                if (command && 'data' in command && 'execute' in command) {
                  commands.push(command.data.toJSON());
                  console.log(`Loaded command: /${command.data.name}`);
                }
            } catch (err) {
                console.error(`Failed to load ${itemPath}`, err);
            }
        }
        continue;
    }

    const commandFiles = fs.readdirSync(itemPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(itemPath, file);
      try {
        const module = await import(`file://${filePath}`);
        const command = module.default;

        if (command && 'data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`Loaded command: /${command.data.name}`);
        } else {
          console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
      } catch (error) {
        console.error(`Failed to load command at ${filePath}`, error);
      }
    }
  }
}

async function deploy() {
  console.log('⏳ Loading commands...');
  await loadCommands();

  if (commands.length === 0) {
    console.log('❌ No commands to deploy.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log(`⏳ Started refreshing ${commands.length} application (/) commands for guild ${DISCORD_GUILD_ID}.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data: any = await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    console.log('Registered commands:');
    for (const cmd of data) {
      console.log(`- /${cmd.name}`);
    }
  } catch (error) {
    console.error('❌ Failed to deploy commands:');
    console.error(error);
  }
}

deploy();
