import { describe, it, expect } from 'vitest';
import { LevelingService } from '../src/services/economy/LevelingService.js';

describe('LevelingService XP Formulas', () => {
  it('should calculate required total XP correctly', () => {
    expect(LevelingService.requiredTotalXp(1)).toBe(100);
    expect(LevelingService.requiredTotalXp(2)).toBe(400);
    expect(LevelingService.requiredTotalXp(3)).toBe(900);
    expect(LevelingService.requiredTotalXp(4)).toBe(1600);
    expect(LevelingService.requiredTotalXp(5)).toBe(2500);
  });

  it('should calculate level from XP correctly', () => {
    // 0 to 99 XP -> Level 0
    expect(LevelingService.calculateLevelFromXp(0)).toBe(0);
    expect(LevelingService.calculateLevelFromXp(99)).toBe(0);
    
    // 100 to 399 XP -> Level 1
    expect(LevelingService.calculateLevelFromXp(100)).toBe(1);
    expect(LevelingService.calculateLevelFromXp(399)).toBe(1);
    
    // 400 to 899 XP -> Level 2
    expect(LevelingService.calculateLevelFromXp(400)).toBe(2);
    expect(LevelingService.calculateLevelFromXp(899)).toBe(2);
  });
});
