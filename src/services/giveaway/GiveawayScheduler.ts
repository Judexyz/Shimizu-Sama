import { Client } from 'discord.js';
import { prisma } from '../../database/prisma.js';
import { GiveawayService } from './GiveawayService.js';
import { logger } from '../../utils/logger.js';

export class GiveawayScheduler {
  private static timers = new Map<string, NodeJS.Timeout>();
  private static reconcileInterval: NodeJS.Timeout | null = null;
  private static client: Client | null = null;

  static async init(client: Client): Promise<void> {
    this.client = client;
    await this.loadActiveGiveaways();

    if (!this.reconcileInterval) {
      this.reconcileInterval = setInterval(() => this.reconcile(), 60000);
    }
  }

  private static async loadActiveGiveaways(): Promise<void> {
    try {
      const activeGiveaways = await prisma.giveaway.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const giveaway of activeGiveaways) {
        this.scheduleGiveaway(giveaway.id, giveaway.endsAt);
      }
      logger.info(`GiveawayScheduler loaded ${activeGiveaways.length} active giveaways.`);
    } catch (err) {
      logger.error({ err }, 'Failed to load active giveaways on startup.');
    }
  }

  static scheduleGiveaway(giveawayId: string, endsAt: Date): void {
    if (this.timers.has(giveawayId)) {
      clearTimeout(this.timers.get(giveawayId)!);
    }

    const now = Date.now();
    const delay = endsAt.getTime() - now;

    if (delay <= 0) {
      if (this.client) {
        GiveawayService.endGiveaway(giveawayId, this.client).catch((err) => {
          logger.error({ err }, `Failed to end expired giveaway ${giveawayId}`);
        });
      }
    } else {
      const MAX_TIMEOUT = 2147483647;
      if (delay > MAX_TIMEOUT) return;

      const timer = setTimeout(() => {
        if (this.client) {
          GiveawayService.endGiveaway(giveawayId, this.client).catch((err) => {
            logger.error({ err }, `Failed to end future giveaway ${giveawayId}`);
          });
        }
        this.timers.delete(giveawayId);
      }, delay);

      this.timers.set(giveawayId, timer);
    }
  }

  static cancelTimer(giveawayId: string): void {
    const timer = this.timers.get(giveawayId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(giveawayId);
    }
  }

  private static async reconcile(): Promise<void> {
    if (!this.client) return;

    try {
      const expired = await prisma.giveaway.findMany({
        where: {
          status: 'ACTIVE',
          endsAt: { lte: new Date() },
        },
      });

      for (const giveaway of expired) {
        await GiveawayService.endGiveaway(giveaway.id, this.client);
      }
    } catch (err) {
      logger.error({ err }, 'Error during GiveawayScheduler reconciliation');
    }
  }
}
