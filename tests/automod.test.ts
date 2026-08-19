import { describe, it, expect, beforeEach } from 'vitest';
import { SpamDetector } from '../src/services/automod/detectors/SpamDetector.js';
import { LinkDetector } from '../src/services/automod/detectors/LinkDetector.js';
import { BadWordDetector } from '../src/services/automod/detectors/BadWordDetector.js';
import { CapsDetector } from '../src/services/automod/detectors/CapsDetector.js';
import { Message } from 'discord.js';
import { CacheService } from '../src/services/cacheService.js';

describe('AutoMod Detectors', () => {
  describe('LinkDetector', () => {
    const detector = new LinkDetector();

    const createMessage = (content: string) => ({
      content,
      guild: { id: '123' },
      author: { bot: false }
    } as Message);

    it('should detect standard discord invites in invites_only mode', async () => {
      const msg = createMessage('Join my server! discord.gg/abc123xyz');
      const result = await detector.detect(msg, { rule: { data: { mode: 'invites_only' } }, message: msg });
      expect(result).not.toBeNull();
      expect(result?.type).toBe('Links');
    });

    it('should NOT detect standard URLs in invites_only mode (False Positive test)', async () => {
      const msg = createMessage('Check out my website https://google.com or watch this https://youtube.com');
      const result = await detector.detect(msg, { rule: { data: { mode: 'invites_only' } }, message: msg });
      expect(result).toBeNull(); // Should be null, no invite here
    });

    it('should detect standard URLs in general link mode', async () => {
      const msg = createMessage('Check out my website https://google.com');
      const result = await detector.detect(msg, { rule: { data: { mode: 'all_links' } }, message: msg });
      expect(result).not.toBeNull();
    });
  });

  describe('CapsDetector', () => {
    const detector = new CapsDetector();
    const createMessage = (content: string) => ({
      content,
      guild: { id: '123' },
      author: { bot: false }
    } as Message);

    it('should detect excessive caps over 70%', async () => {
      const msg = createMessage('THIS IS A VERY LOUD MESSAGE THAT EXCEEDS SEVENTY PERCENT CAPS');
      const result = await detector.detect(msg, { rule: { data: { maxPercentage: 70 } }, message: msg });
      expect(result).not.toBeNull();
    });

    it('should NOT detect normal messages with some caps (False Positive test)', async () => {
      const msg = createMessage('Hello there, I am just typing a normal message with proper capitalization.');
      const result = await detector.detect(msg, { rule: { data: { maxPercentage: 70 } }, message: msg });
      expect(result).toBeNull();
    });

    it('should NOT detect short capitalized messages like acronyms (False Positive test)', async () => {
      const msg = createMessage('HELLO'); // Under 15 chars
      const result = await detector.detect(msg, { rule: { data: { maxPercentage: 70 } }, message: msg });
      expect(result).toBeNull();
    });

    it('should NOT detect messages that are mostly numbers or symbols (False Positive test)', async () => {
      const msg = createMessage('ID: 1234567890 0987654321 111111');
      const result = await detector.detect(msg, { rule: { data: { maxPercentage: 70 } }, message: msg });
      expect(result).toBeNull(); // less than 10 letters
    });
  });

  describe('BadWordDetector', () => {
    const detector = new BadWordDetector();
    const createMessage = (content: string) => ({
      content,
      guild: { id: '123' },
      author: { bot: false }
    } as Message);

    it('should detect blocked words', async () => {
      const msg = createMessage('You are a dummy!');
      const result = await detector.detect(msg, { rule: { data: { words: ['dummy'] } }, message: msg });
      expect(result).not.toBeNull();
    });

    it('should NOT trigger if the word list is empty (False Positive test)', async () => {
      const msg = createMessage('You are a dummy!');
      const result = await detector.detect(msg, { rule: { data: { words: [] } }, message: msg });
      expect(result).toBeNull();
    });

    it('should ignore case when detecting words', async () => {
      const msg = createMessage('You are a DuMmY!');
      const result = await detector.detect(msg, { rule: { data: { words: ['dummy'] } }, message: msg });
      expect(result).not.toBeNull();
    });
  });

  describe('SpamDetector', () => {
    const detector = new SpamDetector();
    const createMessage = (userId: string) => ({
      guild: { id: 'guild1' },
      author: { id: userId, bot: false }
    } as Message);

    beforeEach(async () => {
      await CacheService.clear();
    });

    it('should detect spam if threshold is exceeded', async () => {
      const msg = createMessage('user1');
      let result = null;
      for (let i = 0; i < 5; i++) {
        result = await detector.detect(msg, { rule: { threshold: 5 }, message: msg });
      }
      expect(result).not.toBeNull(); // 5th message triggers it
    });

    it('should NOT detect spam for isolated messages (False Positive test)', async () => {
      const msg = createMessage('user2');
      const result = await detector.detect(msg, { rule: { threshold: 5 }, message: msg });
      expect(result).toBeNull();
    });
  });
});
