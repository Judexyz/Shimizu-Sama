import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GiveawayService } from '../src/services/giveaway/GiveawayService.js';
import { GiveawayScheduler } from '../src/services/giveaway/GiveawayScheduler.js';
import { DurationParser } from '../src/utils/durationParser.js';

// We will mock prisma and the discord.js classes to test logic without a real DB/Discord
vi.mock('../src/database/prisma.js', () => ({
  prisma: {
    giveaway: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    giveawayEntry: {
      create: vi.fn(),
      count: vi.fn()
    }
  }
}));

import { prisma } from '../src/database/prisma.js';

describe('DurationParser', () => {
  it('parses valid durations', () => {
    expect(DurationParser.parse('30s')).toBe(30000);
    expect(DurationParser.parse('10m')).toBe(600000);
    expect(DurationParser.parse('2h')).toBe(7200000);
    expect(DurationParser.parse('1d')).toBe(86400000);
    expect(DurationParser.parse('1w')).toBe(604800000);
  });

  it('rejects invalid or ambiguous durations', () => {
    expect(DurationParser.parse('10')).toBeNull();
    expect(DurationParser.parse('abc')).toBeNull();
    expect(DurationParser.parse('-5m')).toBeNull();
    expect(DurationParser.parse('1month')).toBeNull();
  });
});

describe('GiveawayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Winner Selection logic', () => {
    const mockGuild = {
      members: {
        fetch: vi.fn().mockImplementation((id: string) => {
          if (id === 'user1' || id === 'user2') {
            return Promise.resolve({
              roles: { cache: { has: (roleId: string) => roleId === 'req_role' } }
            });
          }
          if (id === 'user3') {
            return Promise.resolve({
              roles: { cache: { has: (roleId: string) => false } } // user3 doesn't have required role
            });
          }
          // user4 has left the guild (fetch fails)
          if (id === 'user4') {
            return Promise.reject(new Error('Unknown Member'));
          }
          return Promise.resolve(null);
        })
      }
    };

    it('filters out ineligible users', async () => {
      // @ts-ignore - accessing private method for testing
      const winners = await GiveawayService.pickWinners(
        mockGuild as any,
        ['user1', 'user3', 'user4'],
        1,
        'req_role'
      );
      
      expect(winners).toHaveLength(1);
      expect(winners[0]).toBe('user1'); // user3 missing role, user4 left guild
    });

    it('handles insufficient eligible users', async () => {
      // @ts-ignore
      const winners = await GiveawayService.pickWinners(
        mockGuild as any,
        ['user3', 'user4'], // None are eligible
        2,
        'req_role'
      );
      
      expect(winners).toHaveLength(0);
    });
  });

  describe('handleJoinInteraction', () => {
    it('prevents duplicate entries via Prisma constraints', async () => {
      // Mock prisma throwing P2002 error
      (prisma.giveawayEntry.create as any).mockRejectedValue({ code: 'P2002' });
      (prisma.giveaway.findUnique as any).mockResolvedValue({ status: 'ACTIVE' });

      const interaction = {
        customId: 'giveaway_join_123',
        user: { id: 'user1' },
        deferReply: vi.fn(),
        followUp: vi.fn(),
        message: { embeds: [{ data: { fields: [] } }] }
      };

      await GiveawayService.handleJoinInteraction(interaction as any);
      expect(interaction.followUp).toHaveBeenCalledWith('You have already joined this giveaway!');
    });
  });

  describe('endGiveaway Idempotency', () => {
    it('does not pick winners if updateMany count is 0', async () => {
      (prisma.giveaway.findUnique as any).mockResolvedValue({ status: 'ACTIVE', entries: [] });
      (prisma.giveaway.updateMany as any).mockResolvedValue({ count: 0 }); // simulate already updated by another thread

      const client = { guilds: { fetch: vi.fn() } };
      await GiveawayService.endGiveaway('123', client as any);

      // fetch should not be called because count is 0
      expect(client.guilds.fetch).not.toHaveBeenCalled();
    });
  });

  describe('cancelGiveaway', () => {
    it('cancels the timer and updates status', async () => {
      (prisma.giveaway.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.giveaway.findUnique as any).mockResolvedValue({ id: '123' });
      
      const cancelTimerSpy = vi.spyOn(GiveawayScheduler, 'cancelTimer');
      
      const success = await GiveawayService.cancelGiveaway('123', { guilds: { fetch: vi.fn().mockRejectedValue(null) } } as any);
      
      expect(success).toBe(true);
      expect(cancelTimerSpy).toHaveBeenCalledWith('123');
    });
  });
});
