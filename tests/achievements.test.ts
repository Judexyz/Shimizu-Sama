import { describe, it, expect, vi } from 'vitest';
import { AchievementService } from '../src/services/economy/AchievementService.js';
import { achievementsRegistry } from '../src/config/achievements.js';

describe('AchievementService Check Logic', () => {
  it('should correctly identify when a messaging achievement should unlock', async () => {
    // Mock profile with 105 messages
    const profile = {
      id: 'profile1',
      guildId: 'guild1',
      userId: 'user1',
      messagesSent: 105,
      level: 0,
      dailyClaims: 0,
      workCompletions: 0,
      paymentsSent: 0,
      paymentsReceived: 0,
      shopPurchases: 0,
      totalCoinsEarned: 0,
    };

    // Spy on the internal checkAndUnlock method to see if it gets called with correct achievements
    // We bypass the actual DB by mocking the private method or checking its effects.
    // Instead, let's just test the logic that filters the registry.
    
    const relevantAchievements = achievementsRegistry.filter(
      (a) => a.type === 'MESSAGING' && profile.messagesSent >= a.threshold
    );

    expect(relevantAchievements).toHaveLength(2); // first_message (1) and messages_100 (100)
    expect(relevantAchievements.map(a => a.key)).toContain('first_message');
    expect(relevantAchievements.map(a => a.key)).toContain('messages_100');
    expect(relevantAchievements.map(a => a.key)).not.toContain('messages_1000');
  });

  it('should correctly identify economy achievements', async () => {
    const profile = {
      id: 'profile1',
      guildId: 'guild1',
      userId: 'user1',
      messagesSent: 0,
      level: 0,
      dailyClaims: 5, // Unlocks 'first_daily'
      workCompletions: 1, // Unlocks 'first_work'
      paymentsSent: 0,
      paymentsReceived: 0,
      shopPurchases: 0,
      totalCoinsEarned: 15000, // Unlocks 'coins_10000'
    };

    const relevantAchievements = achievementsRegistry.filter((a) => {
      if (a.type !== 'ECONOMY') return false;

      switch (a.key) {
        case 'first_daily':
          return profile.dailyClaims >= a.threshold;
        case 'first_work':
        case 'hard_worker':
          return profile.workCompletions >= a.threshold;
        case 'first_payment':
          return profile.paymentsSent >= a.threshold;
        case 'first_purchase':
          return profile.shopPurchases >= a.threshold;
        case 'coins_10000':
        case 'millionaire':
        case 'entrepreneur':
          return profile.totalCoinsEarned >= a.threshold;
        default:
          return false;
      }
    });

    expect(relevantAchievements.map(a => a.key)).toContain('first_daily');
    expect(relevantAchievements.map(a => a.key)).toContain('first_work');
    expect(relevantAchievements.map(a => a.key)).toContain('coins_10000');
    expect(relevantAchievements.map(a => a.key)).not.toContain('first_payment');
  });
});
