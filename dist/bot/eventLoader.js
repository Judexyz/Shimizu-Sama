import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const loadEvents = async (client) => {
    const eventsPath = path.join(__dirname, '../events');
    if (!fs.existsSync(eventsPath)) {
        logger.warn('Events directory does not exist, skipping event loading.');
        return;
    }
    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const module = await import(`file://${filePath}`);
            const event = module.default;
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            }
            else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            logger.debug(`Loaded event: ${event.name}`);
        }
        catch (error) {
            logger.error({ err: error }, `Failed to load event at ${filePath}`);
        }
    }
};
