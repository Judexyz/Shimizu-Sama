import { Message } from 'discord.js';
import { Detector, DetectorContext, Violation } from '../AutoModTypes.js';

export class CapsDetector implements Detector {
  type = 'Caps';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const text = message.content;
    if (text.length < 15) return null; // Don't trigger on short messages like "HELLO"

    const data = context.rule.data as any;
    const maxPercentage = data?.maxPercentage || 70; // e.g. 70%

    const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;

    if (letterCount < 10) return null; // Need enough letters to get a good percentage

    const percentage = (upperCaseCount / letterCount) * 100;

    if (percentage > maxPercentage) {
      return {
        type: this.type,
        reason: `Message contained ${Math.round(percentage)}% uppercase letters`,
        context: { percentage, maxPercentage, text }
      };
    }

    return null;
  }
}
