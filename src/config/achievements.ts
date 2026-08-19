export type AchievementType = 'MESSAGING' | 'LEVELING' | 'ECONOMY';

export interface Achievement {
  key: string;
  name: string;
  description: string;
  type: AchievementType;
  threshold: number;
}

export const achievementsRegistry: Achievement[] = [
  {
    key: 'first_message',
    name: 'First Steps',
    description: 'Send your first message in the server.',
    type: 'MESSAGING',
    threshold: 1,
  },
  {
    key: 'messages_100',
    name: 'Regular',
    description: 'Send 100 messages.',
    type: 'MESSAGING',
    threshold: 100,
  },
  {
    key: 'messages_1000',
    name: 'Active Member',
    description: 'Send 1,000 messages.',
    type: 'MESSAGING',
    threshold: 1000,
  },

  {
    key: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5.',
    type: 'LEVELING',
    threshold: 5,
  },
  {
    key: 'level_10',
    name: 'Veteran',
    description: 'Reach level 10.',
    type: 'LEVELING',
    threshold: 10,
  },
  {
    key: 'level_25',
    name: 'Elite',
    description: 'Reach level 25.',
    type: 'LEVELING',
    threshold: 25,
  },

  {
    key: 'first_daily',
    name: 'Daily Grind',
    description: 'Claim your first daily reward.',
    type: 'ECONOMY',
    threshold: 1,
  },
  {
    key: 'first_work',
    name: 'First Shift',
    description: 'Complete your first work command.',
    type: 'ECONOMY',
    threshold: 1,
  },
  {
    key: 'first_payment',
    name: 'Generous',
    description: 'Send your first payment to another user.',
    type: 'ECONOMY',
    threshold: 1,
  },
  {
    key: 'first_purchase',
    name: 'Shopper',
    description: 'Purchase your first shop item.',
    type: 'ECONOMY',
    threshold: 1,
  },
  {
    key: 'coins_10000',
    name: 'Wealthy',
    description: 'Earn 10,000 coins through the economy system.',
    type: 'ECONOMY',
    threshold: 10000,
  },
];
