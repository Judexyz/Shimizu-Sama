import { Message } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { CacheService } from '../cacheService.js';
import { SpamDetector } from './detectors/SpamDetector.js';
import { LinkDetector } from './detectors/LinkDetector.js';
import { BadWordDetector } from './detectors/BadWordDetector.js';
import { CapsDetector } from './detectors/CapsDetector.js';
import {
  DuplicateDetector,
  MentionDetector,
  LengthDetector,
  EmojiDetector,
} from './detectors/OtherDetectors.js';
import { Detector } from './AutoModTypes.js';
import { ActionExecutor } from './ActionExecutor.js';

export class AutoModEngine {
  private static detectors: Detector[] = [
    new SpamDetector(),
    new LinkDetector(),
    new BadWordDetector(),
    new CapsDetector(),
    new DuplicateDetector(),
    new MentionDetector(),
    new LengthDetector(),
    new EmojiDetector(),
  ];

  static async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.system) return;

    if (message.flags.has('Ephemeral')) return;

    const cacheKey = `automod:rules:${message.guild.id}`;
    let rules = await CacheService.get<any[]>(cacheKey);

    if (!rules) {
      rules = await prisma.autoModRule.findMany({
        where: { guildId: message.guild.id, enabled: true },
      });
      await CacheService.set(cacheKey, rules, 60);
    }

    if (rules.length === 0) return;

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!message.deletable) {
    }

    for (const rule of rules) {
      const detector = this.detectors.find((d) => d.type === rule.type);
      if (!detector) continue;

      const violation = await detector.detect(message, { rule, message });
      if (violation) {
        await ActionExecutor.execute(message, violation, rule.action);

        if (rule.action !== 'LOG') {
          break;
        }
      }
    }
  }
}
