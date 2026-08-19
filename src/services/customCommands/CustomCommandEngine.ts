import { Message, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { CacheService } from '../cacheService.js';
import { VariableParser, VariableContext } from '../../utils/variables.js';

export class CustomCommandEngine {
  static async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.system) return;

    const text = message.content.trim().toLowerCase();

    const cacheKey = `customcommands:${message.guild.id}`;
    let commands = await CacheService.get<any[]>(cacheKey);

    if (!commands) {
      commands = await prisma.customCommand.findMany({
        where: { guildId: message.guild.id },
      });
      await CacheService.set(cacheKey, commands, 120);
    }

    if (commands.length === 0) return;

    const matchedCommand = commands.find((c) => c.trigger.toLowerCase() === text);
    if (!matchedCommand) return;

    const context: VariableContext = {
      user: message.author,
      member: message.member || undefined,
      guild: message.guild,
      channel: message.channel instanceof TextChannel ? message.channel : undefined,
    };

    const responseText = VariableParser.parse(matchedCommand.response, context);
    if (message.channel.isTextBased() && 'send' in message.channel) {
      await message.channel.send(responseText).catch(() => null);
    }
  }
}
