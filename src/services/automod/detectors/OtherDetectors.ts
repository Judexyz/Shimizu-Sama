import { Message } from 'discord.js';
import { Detector, DetectorContext, Violation } from '../AutoModTypes.js';
import { CacheService } from '../../cacheService.js';

export class DuplicateDetector implements Detector {
  type = 'Duplicate';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const threshold = context.rule.threshold || 3;
    const cacheKey = `automod:dupe:${message.guild.id}:${message.author.id}:${message.content}`;

    const count = await CacheService.increment(cacheKey, 1, 60);

    if (count >= threshold) {
      return {
        type: this.type,
        reason: `Sent the exact same message ${count} times`,
        context: { count, threshold, text: message.content },
      };
    }
    return null;
  }
}

export class MentionDetector implements Detector {
  type = 'Mentions';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const threshold = context.rule.threshold || 5;
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;

    if (mentionCount > threshold) {
      return {
        type: this.type,
        reason: `Exceeded mention threshold (${mentionCount}/${threshold})`,
        context: { mentionCount, threshold },
      };
    }
    return null;
  }
}

export class LengthDetector implements Detector {
  type = 'Length';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const data = context.rule.data as any;
    const maxLength = data?.maxLength || 1000;

    if (message.content.length > maxLength) {
      return {
        type: this.type,
        reason: `Message length (${message.content.length}) exceeded limit (${maxLength})`,
        context: { length: message.content.length, maxLength },
      };
    }
    return null;
  }
}

export class EmojiDetector implements Detector {
  type = 'Emoji';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const threshold = context.rule.threshold || 10;

    const customEmojis = (message.content.match(/<a?:.+?:\d+>/g) || []).length;

    const unicodeEmojis = (
      message.content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []
    ).length;

    const total = customEmojis + unicodeEmojis;

    if (total > threshold) {
      return {
        type: this.type,
        reason: `Exceeded emoji threshold (${total}/${threshold})`,
        context: { total, threshold },
      };
    }
    return null;
  }
}
