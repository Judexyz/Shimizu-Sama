import { SlashCommandBuilder, PermissionFlagsBits, } from 'discord.js';
import { logger } from '../../utils/logger.js';
const NODE_NAME = 'POC_Node';
const command = {
    data: new SlashCommandBuilder()
        .setName('lavalinktest')
        .setDescription('Test Lavalink connectivity and audio playback.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction) => {
        if (!interaction.guild || !interaction.member) {
            return;
        }
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You must be in a voice channel to run the POC.',
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply();
        const client = interaction.client;
        const shoukaku = client.shoukaku;
        if (!shoukaku) {
            await interaction.editReply('❌ Shoukaku is not initialized.');
            return;
        }
        const state = {
            lavalinkConnection: 'PENDING',
            shoukakuReady: 'PENDING',
            youtubeSearch: 'PENDING',
            trackResolved: 'PENDING',
            discordVoice: 'PENDING',
            audioPlayback: 'PENDING',
            cleanup: 'PENDING',
        };
        const renderDiagnostic = () => {
            const values = Object.values(state);
            let result = 'Running...';
            if (values.includes('FAIL')) {
                result = 'Lavalink POC FAILED';
            }
            else if (!values.includes('PENDING')) {
                result = 'Lavalink POC SUCCESS';
            }
            return `\`\`\`text
Shimizu-sama Lavalink Diagnostic
─────────────────────────────────

[1/7] Lavalink connection ........ ${state.lavalinkConnection}
[2/7] Shoukaku node ready ........ ${state.shoukakuReady}
[3/7] YouTube search ............. ${state.youtubeSearch}
[4/7] Track resolved ............. ${state.trackResolved}
[5/7] Discord voice .............. ${state.discordVoice}
[6/7] Audio playback ............. ${state.audioPlayback}
[7/7] Cleanup .................... ${state.cleanup}

─────────────────────────────────
RESULT: ${result}
\`\`\``;
        };
        const updateStatus = async (key, status) => {
            state[key] = status;
            await interaction
                .editReply({
                content: renderDiagnostic(),
            })
                .catch(() => null);
        };
        await interaction.editReply({
            content: renderDiagnostic(),
        });
        let player = null;
        try {
            const node = shoukaku.nodes.get(NODE_NAME);
            if (!node) {
                throw new Error(`Shoukaku node "${NODE_NAME}" is not registered.`);
            }
            await updateStatus('lavalinkConnection', 'PASS');
            await new Promise((resolve, reject) => {
                let finished = false;
                const cleanup = () => {
                    clearTimeout(timeout);
                    node.off('ready', onReady);
                    node.off('error', onError);
                    node.off('close', onClose);
                };
                const succeed = () => {
                    if (finished)
                        return;
                    finished = true;
                    cleanup();
                    resolve();
                };
                const fail = (error) => {
                    if (finished)
                        return;
                    finished = true;
                    cleanup();
                    reject(error);
                };
                const onReady = () => {
                    logger.info({ node: NODE_NAME }, 'Lavalink node ready event received.');
                    succeed();
                };
                const onError = (error) => {
                    fail(new Error(`Shoukaku node error: ${error.message}`));
                };
                const onClose = (code, reason) => {
                    fail(new Error(`Lavalink WebSocket closed: ${code} ${reason || 'No reason provided'}`));
                };
                const timeout = setTimeout(() => {
                    fail(new Error('Timed out waiting for Lavalink ready event after 10 seconds.'));
                }, 10000);
                node.once('ready', onReady);
                node.once('error', onError);
                node.once('close', onClose);
                setTimeout(() => {
                    if (!finished) {
                        succeed();
                    }
                }, 1000);
            });
            await updateStatus('shoukakuReady', 'PASS');
            const searchResult = await node.rest.resolve('amsearch:Never Gonna Give You Up');
            if (!searchResult) {
                throw new Error('Lavalink returned an empty response.');
            }
            await updateStatus('youtubeSearch', 'PASS');
            if (searchResult.loadType === 'error') {
                const errData = searchResult.data;
                throw new Error(`Lavalink load failed: ${errData.message} (Cause: ${errData.cause})`);
            }
            let dataTracks = [];
            if (searchResult.loadType === 'track') {
                dataTracks = [searchResult.data];
            }
            else if (searchResult.loadType === 'playlist') {
                dataTracks = searchResult.data.tracks || [];
            }
            else if (searchResult.loadType === 'search') {
                dataTracks = searchResult.data;
            }
            if (dataTracks.length === 0) {
                throw new Error(`Lavalink search returned zero tracks. LoadType: ${searchResult.loadType}`);
            }
            const track = dataTracks[0];
            if (!track || typeof track.encoded !== 'string') {
                throw new Error('Resolved track does not contain an encoded track.');
            }
            await updateStatus('trackResolved', 'PASS');
            try {
                player = await shoukaku.joinVoiceChannel({
                    guildId: interaction.guild.id,
                    channelId: voiceChannel.id,
                    shardId: interaction.guild.shardId,
                });
            }
            catch (error) {
                throw new Error(`Discord voice connection failed: ${error?.message || 'Unknown error'}`);
            }
            await updateStatus('discordVoice', 'PASS');
            try {
                await player.playTrack({
                    track: {
                        encoded: track.encoded,
                    },
                });
            }
            catch (error) {
                throw new Error(`Lavalink playback failed: ${error?.message || 'Unknown error'}`);
            }
            await new Promise((resolve) => {
                setTimeout(resolve, 5000);
            });
            await updateStatus('audioPlayback', 'PASS');
            try {
                await shoukaku.leaveVoiceChannel(interaction.guild.id);
            }
            catch (error) {
                throw new Error(`Voice cleanup failed: ${error?.message || 'Unknown error'}`);
            }
            player = null;
            await updateStatus('cleanup', 'PASS');
            await interaction.editReply({
                content: renderDiagnostic(),
            });
            logger.info('Lavalink POC completed successfully.');
        }
        catch (error) {
            logger.error({ err: error }, 'Lavalink POC Failed');
            try {
                if (player) {
                    await player.destroy();
                    await shoukaku.leaveVoiceChannel(interaction.guild.id);
                }
            }
            catch { }
            for (const key of Object.keys(state)) {
                if (state[key] === 'PENDING') {
                    state[key] = 'FAIL';
                    break;
                }
            }
            await interaction
                .editReply({
                content: `${renderDiagnostic()}\n` +
                    `**Error Details:**\n` +
                    `\`\`\`text\n` +
                    `${error?.message || 'Unknown error'}\n` +
                    `\`\`\``,
            })
                .catch(() => null);
        }
    },
};
export default command;
