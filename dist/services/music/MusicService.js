import { GuildMusicPlayer } from './GuildMusicPlayer.js';
import { logger } from '../../utils/logger.js';
export class MusicService {
    client;
    players = new Map();
    init(client) {
        this.client = client;
    }
    getPlayer(guildId) {
        return this.players.get(guildId);
    }
    /**
     * Wait until at least one Lavalink node is connected.
     */
    async waitForNode(timeoutMs = 15000) {
        if (!this.client.shoukaku) {
            throw new Error('Shoukaku is not initialized.');
        }
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const nodes = this.client.shoukaku.nodes;
            if (nodes.size > 0) {
                const node = this.client.shoukaku.options.nodeResolver(nodes);
                if (node) {
                    return node;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('No Lavalink nodes available after waiting 15 seconds.');
    }
    async joinChannel(guildId, channelId, shardId) {
        let player = this.players.get(guildId);
        if (player && player.state !== 'DISCONNECTED') {
            return player;
        }
        if (!this.client.shoukaku) {
            throw new Error('Shoukaku is not initialized.');
        }
        await this.waitForNode();
        const shoukakuPlayer = await this.client.shoukaku.joinVoiceChannel({
            guildId,
            channelId,
            shardId,
        });
        player = new GuildMusicPlayer(guildId, shoukakuPlayer, this);
        this.players.set(guildId, player);
        return player;
    }
    async leaveChannel(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            this.players.delete(guildId);
        }
        try {
            await this.client.shoukaku?.leaveVoiceChannel(guildId);
        }
        catch (error) {
            logger.error({
                err: error,
                guildId,
            }, 'Error leaving voice channel');
        }
    }
    async resolve(query, maxRetries = 3) {
        if (!this.client.shoukaku) {
            throw new Error('Shoukaku is not initialized.');
        }
        logger.info({
            query,
        }, 'Resolving query');
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const node = await this.waitForNode(15000);
                logger.info({
                    node: node.name,
                    query,
                    attempt,
                }, 'Using Lavalink node');
                const res = await node.rest.resolve(query);
                if (!res) {
                    logger.warn({
                        query,
                        attempt,
                    }, 'Lavalink returned no response');
                    return [];
                }
                logger.info({
                    query,
                    loadType: res.loadType,
                    attempt,
                }, 'Lavalink resolved query');
                if (res.loadType === 'error') {
                    const err = res.data;
                    throw new Error(`Lavalink load failed: ${err?.message || 'Unknown Lavalink error'}`);
                }
                if (res.loadType === 'track') {
                    return [res.data];
                }
                if (res.loadType === 'playlist') {
                    return res.data.tracks || [];
                }
                if (res.loadType === 'search') {
                    return res.data;
                }
                return [];
            }
            catch (error) {
                lastError =
                    error instanceof Error
                        ? error
                        : new Error(String(error));
                logger.warn({
                    query,
                    attempt,
                    error: lastError.message,
                    connectedNodes: [
                        ...this.client.shoukaku.nodes.keys(),
                    ],
                }, 'Lavalink track resolution failed');
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        throw (lastError ||
            new Error('Failed to resolve track after retries'));
    }
}
export const musicService = new MusicService();
