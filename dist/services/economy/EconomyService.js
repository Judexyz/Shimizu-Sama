import { prisma } from '../../database/prisma.js';
export class EconomyService {
    static async getProfile(guildId, userId) {
        await prisma.guild.upsert({
            where: { id: guildId },
            update: {},
            create: { id: guildId },
        });
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId },
        });
        return await prisma.userGuildProfile.upsert({
            where: { guildId_userId: { guildId, userId } },
            update: {},
            create: { guildId, userId },
        });
    }
    static async getBalance(guildId, userId) {
        const profile = await this.getProfile(guildId, userId);
        return profile.balance;
    }
    static async addBalance(guildId, userId, amount, type) {
        if (amount <= 0)
            throw new Error('Amount must be positive');
        const result = await prisma.$transaction(async (tx) => {
            await tx.guild.upsert({
                where: { id: guildId },
                update: {},
                create: { id: guildId },
            });
            await tx.user.upsert({
                where: { id: userId },
                update: {},
                create: { id: userId },
            });
            const updatedProfile = await tx.userGuildProfile.upsert({
                where: { guildId_userId: { guildId, userId } },
                update: { balance: { increment: amount } },
                create: { guildId, userId, balance: amount },
            });
            await tx.economyTransaction.create({
                data: {
                    guildId,
                    userId,
                    type,
                    amount,
                    balanceAfter: updatedProfile.balance,
                },
            });
            return updatedProfile.balance;
        });
        return result;
    }
    static async removeBalance(guildId, userId, amount, type) {
        if (amount <= 0)
            throw new Error('Amount must be positive');
        const result = await prisma.$transaction(async (tx) => {
            const profile = await tx.userGuildProfile.findUnique({
                where: { guildId_userId: { guildId, userId } },
            });
            if (!profile || profile.balance < amount) {
                throw new Error('Insufficient funds');
            }
            const updatedProfile = await tx.userGuildProfile.update({
                where: { guildId_userId: { guildId, userId } },
                data: { balance: { decrement: amount } },
            });
            await tx.economyTransaction.create({
                data: {
                    guildId,
                    userId,
                    type,
                    amount: -amount,
                    balanceAfter: updatedProfile.balance,
                },
            });
            return updatedProfile.balance;
        });
        return result;
    }
    static async transfer(guildId, fromUserId, toUserId, amount) {
        if (amount <= 0)
            throw new Error('Amount must be positive');
        if (fromUserId === toUserId)
            throw new Error('Cannot transfer to yourself');
        return await prisma.$transaction(async (tx) => {
            const senderProfile = await tx.userGuildProfile.findUnique({
                where: { guildId_userId: { guildId, userId: fromUserId } },
            });
            if (!senderProfile || senderProfile.balance < amount) {
                throw new Error('Insufficient funds');
            }
            await tx.user.upsert({
                where: { id: toUserId },
                update: {},
                create: { id: toUserId },
            });
            const updatedSender = await tx.userGuildProfile.update({
                where: { guildId_userId: { guildId, userId: fromUserId } },
                data: {
                    balance: { decrement: amount },
                    paymentsSent: { increment: 1 },
                },
            });
            const updatedRecipient = await tx.userGuildProfile.upsert({
                where: { guildId_userId: { guildId, userId: toUserId } },
                update: {
                    balance: { increment: amount },
                    paymentsReceived: { increment: 1 },
                },
                create: {
                    guildId,
                    userId: toUserId,
                    balance: amount,
                    paymentsReceived: 1,
                },
            });
            await tx.economyTransaction.createMany({
                data: [
                    {
                        guildId,
                        userId: fromUserId,
                        type: 'PAY_SENT',
                        amount: -amount,
                        balanceAfter: updatedSender.balance,
                    },
                    {
                        guildId,
                        userId: toUserId,
                        type: 'PAY_RECEIVED',
                        amount,
                        balanceAfter: updatedRecipient.balance,
                    },
                ],
            });
            return { updatedSender, updatedRecipient };
        });
    }
    static async claimDaily(guildId, userId) {
        return await prisma.$transaction(async (tx) => {
            await tx.guild.upsert({
                where: { id: guildId },
                update: {},
                create: { id: guildId },
            });
            await tx.user.upsert({
                where: { id: userId },
                update: {},
                create: { id: userId },
            });
            const profile = await tx.userGuildProfile.upsert({
                where: { guildId_userId: { guildId, userId } },
                update: {},
                create: { guildId, userId },
            });
            const now = new Date();
            if (profile.lastDaily) {
                const timeDiff = now.getTime() - profile.lastDaily.getTime();
                if (timeDiff < 24 * 60 * 60 * 1000) {
                    const remainingMs = 24 * 60 * 60 * 1000 - timeDiff;
                    throw new Error(`On cooldown. Remaining ms: ${remainingMs}`);
                }
            }
            const reward = Math.floor(Math.random() * (250 - 100 + 1)) + 100;
            const updatedProfile = await tx.userGuildProfile.update({
                where: { guildId_userId: { guildId, userId } },
                data: {
                    balance: { increment: reward },
                    lastDaily: now,
                    dailyClaims: { increment: 1 },
                    totalCoinsEarned: { increment: reward },
                },
            });
            await tx.economyTransaction.create({
                data: {
                    guildId,
                    userId,
                    type: 'DAILY',
                    amount: reward,
                    balanceAfter: updatedProfile.balance,
                },
            });
            return { reward, newBalance: updatedProfile.balance, updatedProfile };
        });
    }
    static async work(guildId, userId) {
        return await prisma.$transaction(async (tx) => {
            await tx.guild.upsert({
                where: { id: guildId },
                update: {},
                create: { id: guildId },
            });
            await tx.user.upsert({
                where: { id: userId },
                update: {},
                create: { id: userId },
            });
            const profile = await tx.userGuildProfile.upsert({
                where: { guildId_userId: { guildId, userId } },
                update: {},
                create: { guildId, userId },
            });
            const now = new Date();
            if (profile.lastWork) {
                const timeDiff = now.getTime() - profile.lastWork.getTime();
                if (timeDiff < 60 * 60 * 1000) {
                    const remainingMs = 60 * 60 * 1000 - timeDiff;
                    throw new Error(`On cooldown. Remaining ms: ${remainingMs}`);
                }
            }
            const reward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
            const updatedProfile = await tx.userGuildProfile.update({
                where: { guildId_userId: { guildId, userId } },
                data: {
                    balance: { increment: reward },
                    lastWork: now,
                    workCompletions: { increment: 1 },
                    totalCoinsEarned: { increment: reward },
                },
            });
            await tx.economyTransaction.create({
                data: {
                    guildId,
                    userId,
                    type: 'WORK',
                    amount: reward,
                    balanceAfter: updatedProfile.balance,
                },
            });
            return { reward, newBalance: updatedProfile.balance, updatedProfile };
        });
    }
    static async purchaseItem(guildId, userId, shopItemId) {
        return await prisma.$transaction(async (tx) => {
            const item = await tx.shopItem.findUnique({
                where: { id: shopItemId },
            });
            if (!item)
                throw new Error('Item not found');
            if (item.guildId !== guildId)
                throw new Error('Item not from this guild');
            const profile = await tx.userGuildProfile.findUnique({
                where: { guildId_userId: { guildId, userId } },
            });
            if (!profile || profile.balance < item.price) {
                throw new Error('Insufficient funds');
            }
            const existingInventory = await tx.inventoryItem.findUnique({
                where: {
                    profileId_itemId: {
                        profileId: profile.id,
                        itemId: item.id,
                    },
                },
            });
            const updatedProfile = await tx.userGuildProfile.update({
                where: { id: profile.id },
                data: {
                    balance: { decrement: item.price },
                    shopPurchases: { increment: 1 },
                },
            });
            if (existingInventory) {
                await tx.inventoryItem.update({
                    where: { id: existingInventory.id },
                    data: { quantity: { increment: 1 } },
                });
            }
            else {
                await tx.inventoryItem.create({
                    data: {
                        profileId: profile.id,
                        itemId: item.id,
                        quantity: 1,
                    },
                });
            }
            await tx.economyTransaction.create({
                data: {
                    guildId,
                    userId,
                    type: 'SHOP_PURCHASE',
                    amount: -item.price,
                    balanceAfter: updatedProfile.balance,
                },
            });
            return updatedProfile;
        });
    }
    static async getInventory(guildId, userId) {
        const profile = await this.getProfile(guildId, userId);
        return await prisma.inventoryItem.findMany({
            where: { profileId: profile.id },
            include: { item: true },
        });
    }
}
