import { prisma } from '../../database/prisma.js';
import { GiveawayService } from './GiveawayService.js';
import { logger } from '../../utils/logger.js';
export class GiveawayScheduler {
    static timers = new Map();
    static reconcileInterval = null;
    static client = null;
    /**
     * Initializes the scheduler, loads all active giveaways, and starts periodic reconciliation.
     */
    static async init(client) {
        this.client = client;
        await this.loadActiveGiveaways();
        // Run reconciliation every 60 seconds to catch missed timeouts or newly expired
        if (!this.reconcileInterval) {
            this.reconcileInterval = setInterval(() => this.reconcile(), 60000);
        }
    }
    /**
     * Called once on startup or initialization to recover state.
     */
    static async loadActiveGiveaways() {
        try {
            const activeGiveaways = await prisma.giveaway.findMany({
                where: { status: 'ACTIVE' }
            });
            for (const giveaway of activeGiveaways) {
                this.scheduleGiveaway(giveaway.id, giveaway.endsAt);
            }
            logger.info(`GiveawayScheduler loaded ${activeGiveaways.length} active giveaways.`);
        }
        catch (err) {
            logger.error({ err }, 'Failed to load active giveaways on startup.');
        }
    }
    /**
     * Schedules a giveaway to end at the specified Date.
     * If the Date is in the past, ends it immediately.
     */
    static scheduleGiveaway(giveawayId, endsAt) {
        if (this.timers.has(giveawayId)) {
            clearTimeout(this.timers.get(giveawayId));
        }
        const now = Date.now();
        const delay = endsAt.getTime() - now;
        if (delay <= 0) {
            // Already expired, end immediately
            if (this.client) {
                GiveawayService.endGiveaway(giveawayId, this.client).catch(err => {
                    logger.error({ err }, `Failed to end expired giveaway ${giveawayId}`);
                });
            }
        }
        else {
            // Schedule future completion
            // Note: setTimeout limit is ~24.8 days. For giveaways longer than this,
            // the periodic reconciliation will catch them when they get closer/expire.
            const MAX_TIMEOUT = 2147483647; // 32-bit int max
            if (delay > MAX_TIMEOUT)
                return; // Reconciler will handle it later
            const timer = setTimeout(() => {
                if (this.client) {
                    GiveawayService.endGiveaway(giveawayId, this.client).catch(err => {
                        logger.error({ err }, `Failed to end future giveaway ${giveawayId}`);
                    });
                }
                this.timers.delete(giveawayId);
            }, delay);
            this.timers.set(giveawayId, timer);
        }
    }
    /**
     * Cancels a scheduled timer if the giveaway is deleted/cancelled manually.
     */
    static cancelTimer(giveawayId) {
        const timer = this.timers.get(giveawayId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(giveawayId);
        }
    }
    /**
     * Periodically checks the database for any ACTIVE giveaways whose endsAt is in the past.
     * This is a fail-safe against missed timeouts or bot downtime.
     */
    static async reconcile() {
        if (!this.client)
            return;
        try {
            const expired = await prisma.giveaway.findMany({
                where: {
                    status: 'ACTIVE',
                    endsAt: { lte: new Date() }
                }
            });
            for (const giveaway of expired) {
                await GiveawayService.endGiveaway(giveaway.id, this.client);
            }
        }
        catch (err) {
            logger.error({ err }, 'Error during GiveawayScheduler reconciliation');
        }
    }
}
