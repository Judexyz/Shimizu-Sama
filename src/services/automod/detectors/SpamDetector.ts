import { Message } from 'discord.js';
import { Detector, DetectorContext, Violation } from '../AutoModTypes.js';
import { CacheService } from '../../cacheService.js';

export class SpamDetector implements Detector {
  type = 'Spam';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const key = `automod:spam:${message.guild.id}:${message.author.id}`;

    const count = await CacheService.increment(key, 1, 5);

    const threshold = context.rule.threshold || 5;

    if (count >= threshold) {
      return {
        type: this.type,
        reason: `Sent ${count} messages within 5 seconds`,
        context: { count, threshold },
      };
    }

    return null;
  }
}
