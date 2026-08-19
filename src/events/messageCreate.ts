import { Events, Message } from 'discord.js';
import { Event } from '../types/index.js';
import { AutoModEngine } from '../services/automod/AutoModEngine.js';
import { CustomCommandEngine } from '../services/customCommands/CustomCommandEngine.js';
import { LevelingService } from '../services/economy/LevelingService.js';
import { logger } from '../utils/logger.js';
import { PrefixAdapter } from '../utils/PrefixAdapter.js';
import musicCommand from '../commands/music.js';

const PREFIX = 's!';
const MUSIC_ALIASES = [
  'play',
  'pause',
  'resume',
  'skip',
  'stop',
  'queue',
  'disconnect',
  'nowplaying',
  'shuffle',
  'clear',
  'loop',
  'volume',
  'seek',
  'remove',
];

export const event: Event<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (message: Message) => {
    try {
      if (message.author.bot) return;

      if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (commandName && MUSIC_ALIASES.includes(commandName)) {
          const query = args.join(' ');

          let position = null;
          let level = null;
          let seconds = null;
          let mode = null;

          if (commandName === 'remove') position = args[0];
          if (commandName === 'volume') level = args[0];
          if (commandName === 'seek') seconds = args[0];
          if (commandName === 'loop') {
            const input = args[0]?.toLowerCase();
            if (input === 'track' || input === 'queue') mode = input.toUpperCase();
            else mode = 'NONE';
          }

          const adapterArgs: Record<string, any> = { query, position, level, seconds, mode };
          const fakeInteraction = new PrefixAdapter(message, 'music', commandName, adapterArgs);

          await musicCommand.execute(fakeInteraction as any);
          return;
        }
      }

      await AutoModEngine.handleMessage(message);

      await LevelingService.handleMessage(message);

      if (!message.deletable && message.guild?.client.user?.id === message.author.id) {
      } else {
        await CustomCommandEngine.handleMessage(message);
      }
    } catch (error) {
      logger.error({ error }, 'Error in messageCreate event');
    }
  },
};

export default event;
