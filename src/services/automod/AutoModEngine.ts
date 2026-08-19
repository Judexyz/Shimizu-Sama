import { Message } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { CacheService } from '../cacheService.js';
import { SpamDetector } from './detectors/SpamDetector.js';
import { LinkDetector } from './detectors/LinkDetector.js';
import { BadWordDetector } from './detectors/BadWordDetector.js';
import { CapsDetector } from './detectors/CapsDetector.js';
import { DuplicateDetector, MentionDetector, LengthDetector, EmojiDetector } from './detectors/OtherDetectors.js';
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
    
    // Ignore if message is already deleted or not fully in cache
    if (message.flags.has('Ephemeral')) return;

    // Fetch active rules from cache or DB
    const cacheKey = `automod:rules:${message.guild.id}`;
    let rules = await CacheService.get<any[]>(cacheKey);

    if (!rules) {
      rules = await prisma.autoModRule.findMany({
        where: { guildId: message.guild.id, enabled: true }
      });
      await CacheService.set(cacheKey, rules, 60); // Cache for 60 seconds
    }

    if (rules.length === 0) return;

    // Wait a brief moment to see if Discord's native AutoMod deletes the message first.
    // If a message is blocked by Discord AutoMod, it never reaches messageCreate.
    // However, if another bot deletes it instantly, this helps prevent double-processing.
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If message was deleted by something else in the last 100ms, skip processing
    // (Note: discord.js v14 doesn't have a reliable message.deleted property that stays up to date 
    // unless messageDelete event updates it, but we can check if it's deletable).
    if (!message.deletable) {
       // Message is either already deleted, or we lack permissions. 
       // We still might want to warn/timeout for spam, but to prevent double punishment 
       // from native automod vs our automod, we should be careful.
    }

    for (const rule of rules) {
      const detector = this.detectors.find(d => d.type === rule.type);
      if (!detector) continue;

      const violation = await detector.detect(message, { rule, message });
      if (violation) {
        // Execute action
        await ActionExecutor.execute(message, violation, rule.action);
        
        // Stop evaluating further rules if we take a punitive action or delete the message
        // This prevents multiple punishments for a single message (e.g. BadWord AND Caps)
        if (rule.action !== 'LOG') {
          break;
        }
      }
    }
  }
}
