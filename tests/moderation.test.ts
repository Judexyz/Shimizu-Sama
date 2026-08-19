import { describe, it, expect } from 'vitest';
import { ModerationService } from '../src/services/moderationService.js';
import { Guild, User } from 'discord.js';

describe('ModerationService', () => {
  describe('validateHierarchy', () => {
    it('should block moderating the server owner', async () => {
      const guild = { ownerId: '123' } as Guild;
      const target = { id: '123' } as User;
      const moderator = { id: '456' } as User;

      const result = await ModerationService.validateHierarchy(guild, moderator, target);
      expect(result).toBe('You cannot moderate the server owner.');
    });

    it('should block moderating yourself', async () => {
      const guild = { ownerId: '123' } as Guild;
      const target = { id: '456' } as User;
      const moderator = { id: '456' } as User;

      const result = await ModerationService.validateHierarchy(guild, moderator, target);
      expect(result).toBe('You cannot moderate yourself.');
    });

    it('should block moderating the bot itself', async () => {
      const guild = {
        ownerId: '123',
        client: { user: { id: '999' } }
      } as unknown as Guild;
      
      const target = { id: '999' } as User;
      const moderator = { id: '456' } as User;

      const result = await ModerationService.validateHierarchy(guild, moderator, target);
      expect(result).toBe('I cannot moderate myself.');
    });
  });
});
