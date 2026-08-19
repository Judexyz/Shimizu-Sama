import { SlashCommandBuilder } from 'discord.js';
import { musicService } from '../services/music/MusicService.js';
import { PlayerState } from '../types/music.js';
import { ManorTheme } from '../utils/theme.js';
import { EmbedBuilder } from 'discord.js';
const command = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music player commands.')
        .addSubcommand((sub) => sub
        .setName('play')
        .setDescription('Play a song from YouTube.')
        .addStringOption((opt) => opt.setName('query').setDescription('Song title or URL').setRequired(true)))
        .addSubcommand((sub) => sub.setName('pause').setDescription('Pause the current song.'))
        .addSubcommand((sub) => sub.setName('resume').setDescription('Resume the current song.'))
        .addSubcommand((sub) => sub.setName('skip').setDescription('Skip the current song.'))
        .addSubcommand((sub) => sub.setName('stop').setDescription('Stop playing and clear the queue.'))
        .addSubcommand((sub) => sub.setName('disconnect').setDescription('Stop playing and leave the channel.'))
        .addSubcommand((sub) => sub.setName('queue').setDescription('Show the current queue.'))
        .addSubcommand((sub) => sub.setName('nowplaying').setDescription('Show the currently playing song.'))
        .addSubcommand((sub) => sub
        .setName('volume')
        .setDescription('Set the volume.')
        .addIntegerOption((opt) => opt
        .setName('level')
        .setDescription('Volume level (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(150)))
        .addSubcommand((sub) => sub
        .setName('seek')
        .setDescription('Seek to a specific position.')
        .addIntegerOption((opt) => opt
        .setName('seconds')
        .setDescription('Seconds to seek to')
        .setRequired(true)
        .setMinValue(0)))
        .addSubcommand((sub) => sub.setName('shuffle').setDescription('Shuffle the current queue.'))
        .addSubcommand((sub) => sub
        .setName('loop')
        .setDescription('Set loop mode.')
        .addStringOption((opt) => opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices({ name: 'Off', value: 'NONE' }, { name: 'Track', value: 'TRACK' }, { name: 'Queue', value: 'QUEUE' })))
        .addSubcommand((sub) => sub
        .setName('remove')
        .setDescription('Remove a track from the queue.')
        .addIntegerOption((opt) => opt.setName('position').setDescription('Queue position').setRequired(true).setMinValue(1)))
        .addSubcommand((sub) => sub.setName('clear').setDescription('Clear the queue.')),
    execute: async (interaction) => {
        if (!interaction.guild || !interaction.member) {
            return;
        }
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} My deepest apologies, but I cannot entertain you unless you are seated in a parlor (Voice Channel).`),
                ],
                ephemeral: true,
            });
            return;
        }
        if (!voiceChannel.joinable) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} I have been denied entry to that parlor. Please ensure I have the proper invitations (Permissions).`),
                ],
                ephemeral: true,
            });
            return;
        }
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (botMember.voice.channel && botMember.voice.channel.id !== voiceChannel.id) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.error)
                        .setDescription(`${ManorTheme.emojis.error} Forgive me, but I am currently performing for guests in another parlor.`),
                ],
                ephemeral: true,
            });
            return;
        }
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply();
        if (sub === 'play') {
            const query = interaction.options.getString('query', true);
            const searchPrefix = query.startsWith('http') ? '' : 'amsearch:';
            let player = musicService.getPlayer(interaction.guild.id);
            try {
                console.log(`[Music] Resolving query: ${searchPrefix}${query}`);
                const tracks = await musicService.resolve(`${searchPrefix}${query}`);
                if (!tracks || tracks.length === 0) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.info)
                                .setDescription(`${ManorTheme.emojis.error} I have searched the archives, but alas, no such melody could be found.`),
                        ],
                    });
                    return;
                }
                console.log(`[Music] Resolved ${tracks.length} track(s).`);
                player = await musicService.joinChannel(interaction.guild.id, voiceChannel.id, interaction.guild.shardId);
                // Check that the player is actually connected.
                if (player.state === PlayerState.DISCONNECTED) {
                    throw new Error('Player is disconnected.');
                }
                const track = tracks[0];
                const musicTrack = {
                    track,
                    requesterId: member.id,
                    textChannelId: interaction.channelId,
                };
                player.queue.add(musicTrack);
                console.log(`[Music] Added to queue: ${track.info.title}`);
                if (player.state === PlayerState.IDLE) {
                    await player.playNext();
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.primary)
                                .setTitle(`${ManorTheme.emojis.music} A Melody Approaches`)
                                .setDescription(`**${track.info.title}** has been added to the manor's queue.\n*(The musicians are preparing...)*`),
                        ],
                    });
                }
                else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.primary)
                                .setDescription(`${ManorTheme.emojis.queue} **${track.info.title}** has been politely added to the queue.`),
                        ],
                    });
                }
            }
            catch (err) {
                //
                console.error('================ MUSIC PLAY ERROR ================');
                console.error(err);
                console.error('====================================================');
                const errorMessage = err?.message || String(err) || 'Unknown error';
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.error)
                            .setDescription(`${ManorTheme.emojis.error} A disruption occurred in the parlor: ${errorMessage}`),
                    ],
                });
            }
            return;
        }
        const player = musicService.getPlayer(interaction.guild.id);
        if (!player) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ManorTheme.colors.info)
                        .setDescription(`${ManorTheme.emojis.error} The grand piano sits silently in the parlor. No music is currently playing.`),
                ],
            });
            return;
        }
        switch (sub) {
            case 'pause': {
                if (player.state !== PlayerState.PLAYING) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.error)
                                .setDescription(`${ManorTheme.emojis.error} The musicians are already resting.`),
                        ],
                    });
                    return;
                }
                await player.player.setPaused(true);
                player.state = PlayerState.PAUSED;
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.music} The melody has been paused upon your request.`),
                    ],
                });
                break;
            }
            case 'resume': {
                if (player.state !== PlayerState.PAUSED) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.error)
                                .setDescription(`${ManorTheme.emojis.error} The musicians are already playing for you.`),
                        ],
                    });
                    return;
                }
                await player.player.setPaused(false);
                player.state = PlayerState.PLAYING;
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.success)
                            .setDescription(`${ManorTheme.emojis.music} The musicians have resumed their performance.`),
                    ],
                });
                break;
            }
            case 'skip': {
                await player.skip();
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.music} We shall proceed to the next composition on the list.`),
                    ],
                });
                break;
            }
            case 'stop': {
                await player.stop();
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.music} The performance has been halted, and the parchment of requests has been cleared.`),
                    ],
                });
                break;
            }
            case 'disconnect': {
                await player.destroy();
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`${ManorTheme.emojis.gate} I shall take my leave from the parlor now. Good day to you.`),
                    ],
                });
                break;
            }
            case 'queue': {
                const tracks = player.queue.tracks;
                if (tracks.length === 0) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.info)
                                .setDescription(`${ManorTheme.emojis.queue} The request parchment is currently empty.`),
                        ],
                    });
                    return;
                }
                const qList = tracks
                    .slice(0, 10)
                    .map((t, i) => `${i + 1}. **${t.track.info.title}**`)
                    .join('\n');
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.primary)
                            .setTitle(`${ManorTheme.emojis.queue} The Manor's Musical Queue`)
                            .setDescription(`${qList}${tracks.length > 10 ? `\n\n*...and ${tracks.length - 10} more await their turn*` : ''}`),
                    ],
                });
                break;
            }
            case 'nowplaying': {
                const current = player.queue.current;
                if (!current) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.info)
                                .setDescription(`${ManorTheme.emojis.error} The grand piano is currently untouched.`),
                        ],
                    });
                    return;
                }
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.primary)
                            .setDescription(`${ManorTheme.emojis.music} Currently filling the parlor: **${current.track.info.title}**`),
                    ],
                });
                break;
            }
            case 'volume': {
                const vol = interaction.options.getInteger('level', true);
                await player.player.setGlobalVolume(vol);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`🔊 The acoustic resonance has been adjusted to ${vol}%.`),
                    ],
                });
                break;
            }
            case 'seek': {
                const secs = interaction.options.getInteger('seconds', true);
                await player.player.seekTo(secs * 1000);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`⏩ The musicians have skipped ahead to the ${secs}s mark.`),
                    ],
                });
                break;
            }
            case 'shuffle': {
                player.queue.shuffle();
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`🔀 The musical arrangement has been pleasantly shuffled.`),
                    ],
                });
                break;
            }
            case 'loop': {
                const mode = interaction.options.getString('mode', true);
                player.queue.loopMode = mode;
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`🔁 The musicians have been instructed to loop: ${mode}.`),
                    ],
                });
                break;
            }
            case 'remove': {
                const pos = interaction.options.getInteger('position', true);
                const removed = player.queue.remove(pos - 1);
                if (removed) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.info)
                                .setDescription(`🗑️ **${removed.track.info.title}** has been gracefully removed from the parchment.`),
                        ],
                    });
                }
                else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ManorTheme.colors.error)
                                .setDescription(`${ManorTheme.emojis.error} I could not find a request at that position.`),
                        ],
                    });
                }
                break;
            }
            case 'clear': {
                player.queue.clear();
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(ManorTheme.colors.info)
                            .setDescription(`🧹 The musicians have been dismissed, and the queue has been cleared.`),
                    ],
                });
                break;
            }
        }
    },
};
export default command;
