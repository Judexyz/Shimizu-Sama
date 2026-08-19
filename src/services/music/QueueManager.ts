import { MusicTrack, LoopMode } from '../../types/music.js';

export class QueueManager {
  private queue: MusicTrack[] = [];
  private history: MusicTrack[] = [];
  public current: MusicTrack | null = null;
  public loopMode: LoopMode = LoopMode.NONE;

  public add(track: MusicTrack): void {
    this.queue.push(track);
  }

  public addMany(tracks: MusicTrack[]): void {
    this.queue.push(...tracks);
  }

  public getNext(isFailed: boolean = false): MusicTrack | null {
    if (this.current) {
      if (!isFailed) {
        if (this.loopMode === LoopMode.TRACK) {
          return this.current;
        }
        this.history.push(this.current);

        if (this.history.length > 20) {
          this.history.shift();
        }
        if (this.loopMode === LoopMode.QUEUE) {
          this.queue.push(this.current);
        }
      }
    }

    this.current = this.queue.shift() || null;
    return this.current;
  }

  public shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  public clear(): void {
    this.queue = [];
  }

  public get length(): number {
    return this.queue.length;
  }

  public get tracks(): MusicTrack[] {
    return [...this.queue];
  }

  public remove(index: number): MusicTrack | null {
    if (index < 0 || index >= this.queue.length) return null;
    return this.queue.splice(index, 1)[0];
  }

  public reset(): void {
    this.queue = [];
    this.history = [];
    this.current = null;
    this.loopMode = LoopMode.NONE;
  }
}
