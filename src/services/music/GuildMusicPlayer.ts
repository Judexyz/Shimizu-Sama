import { Player, TrackExceptionEvent } from 'shoukaku';
import { Message } from 'discord.js';
import { PlayerState } from '../../types/music.js';
import { QueueManager } from './QueueManager.js';
import { logger } from '../../utils/logger.js';
import { MusicService } from './MusicService.js';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export class GuildMusicPlayer {
  public readonly guildId: string;
  public readonly player: Player;
  public readonly queue: QueueManager;

  private readonly musicService: MusicService;

  public state: PlayerState = PlayerState.IDLE;

  private currentMessage: Message | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private announceTimeout: NodeJS.Timeout | null = null;

  private isTransitioning: boolean = false;
  private currentTrackStarted: boolean = false;

  private lastUpdate: {
    position: number;
    time: number;
  } = {
    position: 0,
    time: Date.now(),
  };

  constructor(
    guildId: string,
    player: Player,
    musicService: MusicService
  ) {
    this.guildId = guildId;
    this.player = player;
    this.musicService = musicService;

    this.queue = new QueueManager();
    this.state = PlayerState.IDLE;

    this.player.on('start', () => this.onStart());
    this.player.on('end', (data) => this.onEnd(data.reason));
    this.player.on('closed', (data) => this.onClosed(data.code, data.reason));
    this.player.on('exception', (data) => this.onException(data));
    this.player.on('stuck', () => this.onStuck());
    this.player.on('update', (data) => this.onUpdate(data));
  }

  /**
   * Start the next track in the queue.
   *
   * If the track fails to load, automatically move to the next track.
   */
  public async playNext(isFailed: boolean = false): Promise<void> {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.currentTrackStarted = false;

    try {
      const nextTrack = this.queue.getNext(isFailed);

      if (!nextTrack) {
        this.state = PlayerState.IDLE;

        await this.player.stopTrack().catch(() => null);

        if (!this.idleTimer) {
          this.idleTimer = setTimeout(() => {
            this.destroy().catch(() => null);
          }, IDLE_TIMEOUT_MS);
        }

        return;
      }

      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }

      // Clear any pending announcement from the previous track.
      if (this.announceTimeout) {
        clearTimeout(this.announceTimeout);
        this.announceTimeout = null;
      }

      try {
        await this.player.playTrack({
          track: {
            encoded: nextTrack.track.encoded,
          },
        });

        /*
         * Important:
         * playTrack() succeeding only means Lavalink accepted the track.
         * YouTube may still fail shortly afterwards.
         *
         * The actual PLAYING state is therefore confirmed by onStart().
         */
      } catch (error) {
        logger.error(
          {
            err: error,
            guildId: this.guildId,
            title: nextTrack.track.info.title,
          },
          'Failed to send track to Lavalink, continuing to next track.'
        );

        this.isTransitioning = false;

        await this.playNext(true);
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Skip the current track.
   */
  public async skip(): Promise<void> {
    if (this.isTransitioning) {
      return;
    }

    await this.playNext(false);
  }

  /**
   * Stop playback and clear the queue.
   *
   * IMPORTANT:
   * This does NOT disconnect from the voice channel.
   * Use destroy()/disconnect for that.
   */
  public async stop(): Promise<void> {
    this.queue.reset();

    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }

    if (this.currentMessage) {
      await this.currentMessage.delete().catch(() => null);
      this.currentMessage = null;
    }

    this.state = PlayerState.IDLE;

    await this.player.stopTrack().catch(() => null);
  }

  /**
   * Destroy the music player and leave the voice channel.
   */
  public async destroy(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }

    if (this.currentMessage) {
      await this.currentMessage.delete().catch(() => null);
      this.currentMessage = null;
    }

    this.isTransitioning = false;
    this.state = PlayerState.DISCONNECTED;

    this.queue.reset();

    try {
      await this.musicService.leaveChannel(this.guildId);
    } catch (error) {
      logger.error(
        {
          err: error,
          guildId: this.guildId,
        },
        'Failed to cleanly destroy player'
      );
    }
  }

  /**
   * Approximate current playback position.
   */
  public get position(): number {
    if (this.state !== PlayerState.PLAYING) {
      return this.lastUpdate.position;
    }

    return (
      this.lastUpdate.position +
      (Date.now() - this.lastUpdate.time)
    );
  }

  // ============================================================
  // Lavalink Event Handlers
  // ============================================================

  /**
   * Called when Lavalink confirms that playback actually started.
   */
  private async onStart(): Promise<void> {
    this.state = PlayerState.PLAYING;
    this.currentTrackStarted = true;

    const track = this.queue.current;

    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }

    if (!track || !track.textChannelId) {
      return;
    }

    /*
     * Delay the announcement slightly.
     *
     * YouTube/Lavalink can sometimes emit TrackStart immediately
     * before TrackException/LOAD_FAILED for an unplayable video.
     */
    this.announceTimeout = setTimeout(async () => {
      this.announceTimeout = null;

      // Track is no longer active.
      if (
        this.state !== PlayerState.PLAYING ||
        this.queue.current !== track
      ) {
        return;
      }

      try {
        const client = this.musicService.client;

        const channel = await client.channels
          .fetch(track.textChannelId)
          .catch(() => null);

        if (
          channel &&
          channel.isTextBased() &&
          'send' in channel
        ) {
          const author = track.track.info.author;
          const title = track.track.info.title;

          if (this.currentMessage) {
            await this.currentMessage.delete().catch(() => null);
          }

          this.currentMessage = await channel.send(
            `🎶 Now playing: **${title}** by ${author} (<@${track.requesterId}>)`
          );
        }
      } catch {
        // Ignore Discord message errors.
      }
    }, 1000);
  }

  /**
   * Called when Lavalink reports that the current track ended.
   */
  private async onEnd(reason: string): Promise<void> {
    logger.info(
      {
        guildId: this.guildId,
        reason,
        transitioning: this.isTransitioning,
      },
      'Track ended'
    );

    /*
     * REPLACED happens when we intentionally replace the current
     * track with another track. Do not advance the queue here.
     */
    if (reason === 'REPLACED') {
      return;
    }

    /*
     * STOPPED means playback was intentionally stopped.
     */
    if (reason === 'STOPPED') {
      this.state = PlayerState.IDLE;
      return;
    }

    /*
     * IMPORTANT:
     *
     * LOAD_FAILED must always advance the queue.
     * If Lavalink fails to load a track (e.g. AllClientsFailedException) 
     * without ever starting it, it might incorrectly emit 'FINISHED'.
     * We detect this by checking if the track ever fired TrackStartEvent.
     */
    if (reason === 'LOAD_FAILED' || (reason === 'FINISHED' && !this.currentTrackStarted)) {
      this.isTransitioning = false;

      await this.playNext(true);
      return;
    }

    /*
     * Normal track completion.
     */
    if (!this.isTransitioning) {
      await this.playNext(false);
    }
  }

  /**
   * Called when Lavalink closes the player connection.
   */
  private async onClosed(
    code: number,
    reason: string
  ): Promise<void> {
    logger.warn(
      {
        guildId: this.guildId,
        code,
        reason,
      },
      'Player closed connection'
    );

    await this.destroy();
  }

  /**
   * Called when Lavalink reports a playback exception.
   *
   * We log the exception here, but DO NOT call playNext().
   *
   * Lavalink normally follows this with LOAD_FAILED, and onEnd()
   * is responsible for advancing the queue. This prevents the
   * queue from accidentally advancing twice.
   */
  private async onException(
    event: TrackExceptionEvent
  ): Promise<void> {
    const track = this.queue.current;

    if (track) {
      logger.error(
        {
          guildId: this.guildId,
          title: track.track.info.title,
          uri: track.track.info.uri,
          exception: event.exception.message,
          cause: event.exception.cause,
        },
        'Track threw an exception'
      );
    }

    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }
  }

  /**
   * Called when Lavalink considers playback stuck.
   */
  private async onStuck(): Promise<void> {
    const track = this.queue.current;

    if (track) {
      logger.warn(
        {
          guildId: this.guildId,
          title: track.track.info.title,
        },
        'Track stuck, skipping'
      );
    }

    if (!this.isTransitioning) {
      await this.playNext(true);
    }
  }

  /**
   * Keep track of Lavalink's playback position.
   */
  private onUpdate(data: {
    state?: {
      position?: number;
      time?: number;
    };
  }): void {
    if (
      data.state &&
      typeof data.state.position === 'number'
    ) {
      this.lastUpdate = {
        position: data.state.position,
        time: data.state.time || Date.now(),
      };
    }
  }
}

