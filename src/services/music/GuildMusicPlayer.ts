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

  constructor(guildId: string, player: Player, musicService: MusicService) {
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

  public async skip(): Promise<void> {
    if (this.isTransitioning) {
      return;
    }

    await this.playNext(false);
  }

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

  public get position(): number {
    if (this.state !== PlayerState.PLAYING) {
      return this.lastUpdate.position;
    }

    return this.lastUpdate.position + (Date.now() - this.lastUpdate.time);
  }

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

    this.announceTimeout = setTimeout(async () => {
      this.announceTimeout = null;

      if (this.state !== PlayerState.PLAYING || this.queue.current !== track) {
        return;
      }

      try {
        const client = this.musicService.client;

        const channel = await client.channels.fetch(track.textChannelId).catch(() => null);

        if (channel && channel.isTextBased() && 'send' in channel) {
          const author = track.track.info.author;
          const title = track.track.info.title;

          if (this.currentMessage) {
            await this.currentMessage.delete().catch(() => null);
          }

          this.currentMessage = await channel.send(
            `🎶 Now playing: **${title}** by ${author} (<@${track.requesterId}>)`
          );
        }
      } catch {}
    }, 1000);
  }

  private async onEnd(reason: string): Promise<void> {
    logger.info(
      {
        guildId: this.guildId,
        reason,
        transitioning: this.isTransitioning,
      },
      'Track ended'
    );

    if (reason === 'REPLACED') {
      return;
    }

    if (reason === 'STOPPED') {
      this.state = PlayerState.IDLE;
      return;
    }

    if (reason === 'LOAD_FAILED' || (reason === 'FINISHED' && !this.currentTrackStarted)) {
      this.isTransitioning = false;

      await this.playNext(true);
      return;
    }

    if (!this.isTransitioning) {
      await this.playNext(false);
    }
  }

  private async onClosed(code: number, reason: string): Promise<void> {
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

  private async onException(event: TrackExceptionEvent): Promise<void> {
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

  private onUpdate(data: {
    state?: {
      position?: number;
      time?: number;
    };
  }): void {
    if (data.state && typeof data.state.position === 'number') {
      this.lastUpdate = {
        position: data.state.position,
        time: data.state.time || Date.now(),
      };
    }
  }
}
