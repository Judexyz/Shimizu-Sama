import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
} from 'discord.js';
import { Command } from '../types/index.js';
import { musicService } from '../services/music/MusicService.js';
import { MusicTrack, LoopMode, PlayerState } from '../types/music.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music player commands.')

    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Play a song from YouTube.')
        .addStringOption(opt =>
          opt
            .setName('query')
            .setDescription('Song title or URL')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('pause')
        .setDescription('Pause the current song.')
    )

    .addSubcommand(sub =>
      sub
        .setName('resume')
        .setDescription('Resume the current song.')
    )

    .addSubcommand(sub =>
      sub
        .setName('skip')
        .setDescription('Skip the current song.')
    )

    .addSubcommand(sub =>
      sub
        .setName('stop')
        .setDescription('Stop playing and clear the queue.')
    )

    .addSubcommand(sub =>
      sub
        .setName('disconnect')
        .setDescription('Stop playing and leave the channel.')
    )

    .addSubcommand(sub =>
      sub
        .setName('queue')
        .setDescription('Show the current queue.')
    )

    .addSubcommand(sub =>
      sub
        .setName('nowplaying')
        .setDescription('Show the currently playing song.')
    )

    .addSubcommand(sub =>
      sub
        .setName('volume')
        .setDescription('Set the volume.')
        .addIntegerOption(opt =>
          opt
            .setName('level')
            .setDescription('Volume level (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(150)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('seek')
        .setDescription('Seek to a specific position.')
        .addIntegerOption(opt =>
          opt
            .setName('seconds')
            .setDescription('Seconds to seek to')
            .setRequired(true)
            .setMinValue(0)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('shuffle')
        .setDescription('Shuffle the current queue.')
    )

    .addSubcommand(sub =>
      sub
        .setName('loop')
        .setDescription('Set loop mode.')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Loop mode')
            .setRequired(true)
            .addChoices(
              { name: 'Off', value: 'NONE' },
              { name: 'Track', value: 'TRACK' },
              { name: 'Queue', value: 'QUEUE' }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a track from the queue.')
        .addIntegerOption(opt =>
          opt
            .setName('position')
            .setDescription('Queue position')
            .setRequired(true)
            .setMinValue(1)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Clear the queue.')
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild || !interaction.member) {
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    // ============================================================
    // Voice channel checks
    // ============================================================

    if (!voiceChannel) {
      await interaction.reply({
        content:
          '❌ You must be in a voice channel to use music commands.',
        ephemeral: true,
      });
      return;
    }

    if (!voiceChannel.joinable) {
      await interaction.reply({
        content:
          '❌ I do not have permission to join your voice channel.',
        ephemeral: true,
      });
      return;
    }

    // Check if the bot is already in another voice channel.
    const botMember = await interaction.guild.members.fetch(
      interaction.client.user.id
    );

    if (
      botMember.voice.channel &&
      botMember.voice.channel.id !== voiceChannel.id
    ) {
      await interaction.reply({
        content:
          '❌ I am already playing in another voice channel.',
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    await interaction.deferReply();

    // ============================================================
    // PLAY
    // ============================================================

    if (sub === 'play') {
      const query = interaction.options.getString(
        'query',
        true
      );

      const searchPrefix = query.startsWith('http')
        ? ''
        : 'amsearch:';

      let player = musicService.getPlayer(
        interaction.guild.id
      );

      try {
        console.log(
          `[Music] Resolving query: ${searchPrefix}${query}`
        );

        const tracks = await musicService.resolve(
          `${searchPrefix}${query}`
        );

        if (!tracks || tracks.length === 0) {
          await interaction.editReply(
            '❌ No results found.'
          );
          return;
        }

        console.log(
          `[Music] Resolved ${tracks.length} track(s).`
        );

        player = await musicService.joinChannel(
          interaction.guild.id,
          voiceChannel.id,
          interaction.guild.shardId
        );

        // Check that the player is actually connected.
        if (player.state === PlayerState.DISCONNECTED) {
          throw new Error('Player is disconnected.');
        }

        // ========================================================
        // Add the first resolved track to our queue.
        // ========================================================

        const track = tracks[0];

        const musicTrack: MusicTrack = {
          track,
          requesterId: member.id,
          textChannelId: interaction.channelId,
        };

        player.queue.add(musicTrack);

        console.log(
          `[Music] Added to queue: ${track.info.title}`
        );

        // ========================================================
        // Start playback if the player is idle.
        // ========================================================

        if (player.state === PlayerState.IDLE) {
          await player.playNext();

          await interaction.editReply(
            `🎶 Added to queue: **${track.info.title}**\n*(Waiting for playback to start...)*`
          );
        } else {
          await interaction.editReply(
            `🎶 Added to queue: **${track.info.title}**`
          );
        }
      } catch (err: any) {
        // ========================================================
        // TEMPORARY DEBUG ERROR HANDLING
        //
        // We intentionally show the real error here instead of
        // hiding it behind "YouTube is temporarily unavailable."
        // ========================================================

        console.error(
          '================ MUSIC PLAY ERROR ================'
        );

        console.error(err);

        console.error(
          '===================================================='
        );

        const errorMessage =
          err?.message ||
          String(err) ||
          'Unknown error';

        await interaction.editReply(
          `❌ Error: ${errorMessage}`
        );
      }

      return;
    }

    // ============================================================
    // ALL OTHER COMMANDS REQUIRE AN ACTIVE PLAYER
    // ============================================================

    const player = musicService.getPlayer(
      interaction.guild.id
    );

    if (!player) {
      await interaction.editReply(
        '❌ No music is currently playing.'
      );
      return;
    }

    // ============================================================
    // PAUSE
    // ============================================================

    switch (sub) {
      case 'pause': {
        if (player.state !== PlayerState.PLAYING) {
          await interaction.editReply(
            '❌ Player is not currently playing.'
          );
          return;
        }

        await player.player.setPaused(true);

        player.state = PlayerState.PAUSED;

        await interaction.editReply(
          '⏸️ Paused.'
        );

        break;
      }

      // ==========================================================
      // RESUME
      // ==========================================================

      case 'resume': {
        if (player.state !== PlayerState.PAUSED) {
          await interaction.editReply(
            '❌ Player is not paused.'
          );
          return;
        }

        await player.player.setPaused(false);

        player.state = PlayerState.PLAYING;

        await interaction.editReply(
          '▶️ Resumed.'
        );

        break;
      }

      // ==========================================================
      // SKIP
      // ==========================================================

      case 'skip': {
        await player.skip();

        await interaction.editReply(
          '⏭️ Skipped.'
        );

        break;
      }

      // ==========================================================
      // STOP
      // ==========================================================

      case 'stop': {
        await player.stop();

        await interaction.editReply(
          '⏹️ Stopped and cleared queue.'
        );

        break;
      }

      // ==========================================================
      // DISCONNECT
      // ==========================================================

      case 'disconnect': {
        await player.destroy();

        await interaction.editReply(
          '👋 Disconnected.'
        );

        break;
      }

      // ==========================================================
      // QUEUE
      // ==========================================================

      case 'queue': {
        const tracks = player.queue.tracks;

        if (tracks.length === 0) {
          await interaction.editReply(
            'The queue is empty.'
          );
          return;
        }

        const qList = tracks
          .slice(0, 10)
          .map(
            (t, i) =>
              `${i + 1}. **${t.track.info.title}**`
          )
          .join('\n');

        await interaction.editReply(
          `**Queue:**\n${qList}${
            tracks.length > 10
              ? `\n*...and ${tracks.length - 10} more*`
              : ''
          }`
        );

        break;
      }

      // ==========================================================
      // NOW PLAYING
      // ==========================================================

      case 'nowplaying': {
        const current = player.queue.current;

        if (!current) {
          await interaction.editReply(
            '❌ Nothing is playing.'
          );
          return;
        }

        await interaction.editReply(
          `🎶 Now playing: **${current.track.info.title}**`
        );

        break;
      }

      // ==========================================================
      // VOLUME
      // ==========================================================

      case 'volume': {
        const vol = interaction.options.getInteger(
          'level',
          true
        );

        await player.player.setGlobalVolume(vol);

        await interaction.editReply(
          `🔊 Volume set to ${vol}%.`
        );

        break;
      }

      // ==========================================================
      // SEEK
      // ==========================================================

      case 'seek': {
        const secs = interaction.options.getInteger(
          'seconds',
          true
        );

        await player.player.seekTo(
          secs * 1000
        );

        await interaction.editReply(
          `⏩ Seeked to ${secs}s.`
        );

        break;
      }

      // ==========================================================
      // SHUFFLE
      // ==========================================================

      case 'shuffle': {
        player.queue.shuffle();

        await interaction.editReply(
          '🔀 Queue shuffled.'
        );

        break;
      }

      // ==========================================================
      // LOOP
      // ==========================================================

      case 'loop': {
        const mode = interaction.options.getString(
          'mode',
          true
        ) as LoopMode;

        player.queue.loopMode = mode;

        await interaction.editReply(
          `🔁 Loop mode set to ${mode}.`
        );

        break;
      }

      // ==========================================================
      // REMOVE
      // ==========================================================

      case 'remove': {
        const pos = interaction.options.getInteger(
          'position',
          true
        );

        const removed = player.queue.remove(
          pos - 1
        );

        if (removed) {
          await interaction.editReply(
            `🗑️ Removed **${removed.track.info.title}**.`
          );
        } else {
          await interaction.editReply(
            '❌ Invalid position.'
          );
        }

        break;
      }

      // ==========================================================
      // CLEAR
      // ==========================================================

      case 'clear': {
        player.queue.clear();

        await interaction.editReply(
          '🗑️ Queue cleared.'
        );

        break;
      }
    }
  },
};

export default command;
