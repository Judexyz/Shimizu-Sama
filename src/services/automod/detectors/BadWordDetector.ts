import { Message } from 'discord.js';
import { Detector, DetectorContext, Violation } from '../AutoModTypes.js';

export class BadWordDetector implements Detector {
  type = 'BadWords';

  async detect(message: Message, context: DetectorContext): Promise<Violation | null> {
    if (!message.guild || message.author.bot) return null;

    const data = context.rule.data as any;
    if (!data || !Array.isArray(data.words)) return null;

    const words: string[] = data.words;
    if (words.length === 0) return null;

    const text = message.content.toLowerCase();

    for (const word of words) {
      if (text.includes(word.toLowerCase())) {
        return {
          type: this.type,
          reason: `Used a blocked word: ||${word}||`,
          context: { word, text: message.content }
        };
      }
    }

    return null;
  }
}
