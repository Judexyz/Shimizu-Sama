import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShimizuClient } from './client.js';
import { Command } from '../types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadCommands = async (client: ShimizuClient): Promise<void> => {
  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) {
    logger.warn('Commands directory does not exist, skipping command loading.');
    return;
  }

  const commandItems = fs.readdirSync(commandsPath);

  for (const item of commandItems) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      const commandFiles = fs.readdirSync(itemPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
      for (const file of commandFiles) {
        const filePath = path.join(itemPath, file);
        await loadFile(filePath, client);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      await loadFile(itemPath, client);
    }
  }
};

async function loadFile(filePath: string, client: ShimizuClient) {
  try {
    const module = await import(`file://${filePath}`);
    const command: Command = module.default;

    if (command && 'data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: /${command.data.name}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  } catch (error) {
    logger.error({ err: error }, `Failed to load command at ${filePath}`);
  }
}
