import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GuildMusicPlayer } from '../src/services/music/GuildMusicPlayer.js';
import { LoopMode, PlayerState, MusicTrack } from '../src/types/music.js';

describe('QueueManager & GuildMusicPlayer', () => {
  let mockPlayer: any;
  let mockMusicService: any;
  let guildPlayer: GuildMusicPlayer;

  const createMockTrack = (id: string): MusicTrack => ({
    track: { encoded: `encoded_${id}`, info: { title: `Track ${id}` } } as any,
    requesterId: 'user1',
    textChannelId: 'channel1'
  });

  beforeEach(() => {
    mockPlayer = {
      playTrack: vi.fn().mockResolvedValue(undefined),
      stopTrack: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };

    mockMusicService = {
      leaveChannel: vi.fn().mockResolvedValue(undefined),
      client: {}
    };

    guildPlayer = new GuildMusicPlayer('guild1', mockPlayer as any, mockMusicService as any);
  });

  afterEach(async () => {
    await guildPlayer.destroy();
  });

  it('skip with one next track', async () => {
    const track1 = createMockTrack('1');
    const track2 = createMockTrack('2');
    
    guildPlayer.queue.add(track1);
    guildPlayer.queue.add(track2);
    
    await guildPlayer.playNext(); // Plays track 1
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
    expect(mockPlayer.playTrack).toHaveBeenCalledWith({ track: { encoded: 'encoded_1' } });
    
    await guildPlayer.skip(); // Skips to track 2
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_2');
    expect(mockPlayer.playTrack).toHaveBeenCalledWith({ track: { encoded: 'encoded_2' } });
  });

  it('skip with multiple next tracks', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    guildPlayer.queue.add(createMockTrack('3'));
    
    await guildPlayer.playNext();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
    
    await guildPlayer.skip();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_2');
    
    await guildPlayer.skip();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_3');
  });

  it('skip with empty queue', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    await guildPlayer.playNext();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
    
    await guildPlayer.skip(); // Skips to empty
    expect(guildPlayer.queue.current).toBeNull();
    expect(guildPlayer.state).toBe(PlayerState.IDLE);
    expect(mockPlayer.stopTrack).toHaveBeenCalled();
  });

  it('skip during PLAYING', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    await guildPlayer.playNext();
    
    guildPlayer.state = PlayerState.PLAYING;
    await guildPlayer.skip();
    
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_2');
    expect(guildPlayer.state).toBe(PlayerState.PLAYING);
  });

  it('natural track end', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    await guildPlayer.playNext();
    
    // Simulate natural end
    await (guildPlayer as any).onEnd('FINISHED');
    
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_2');
    expect(mockPlayer.playTrack).toHaveBeenCalledTimes(2);
  });

  it('skip + loop TRACK', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    guildPlayer.queue.loopMode = LoopMode.TRACK;
    
    await guildPlayer.playNext();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
    
    await guildPlayer.skip();
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1'); // Should replay same track
    
    // Ensure playTrack was called twice with track 1
    expect(mockPlayer.playTrack).toHaveBeenLastCalledWith({ track: { encoded: 'encoded_1' } });
  });

  it('skip + loop QUEUE', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    guildPlayer.queue.loopMode = LoopMode.QUEUE;
    
    await guildPlayer.playNext(); // current=1, queue=[2]
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
    
    await guildPlayer.skip(); // current=2, queue=[1]
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_2');
    expect(guildPlayer.queue.length).toBe(1);
    
    await guildPlayer.skip(); // current=1, queue=[2]
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
  });

  it('ensuring playNext() is not invoked twice', async () => {
    guildPlayer.queue.add(createMockTrack('1'));
    guildPlayer.queue.add(createMockTrack('2'));
    
    let resolvePlayTrack: any;
    mockPlayer.playTrack = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        resolvePlayTrack = resolve;
      });
    });

    // Start first skip
    const p1 = guildPlayer.skip();
    // While transitioning, start second skip
    const p2 = guildPlayer.skip();

    expect((guildPlayer as any).isTransitioning).toBe(true);

    if (resolvePlayTrack) resolvePlayTrack();
    await Promise.all([p1, p2]);

    expect((guildPlayer as any).isTransitioning).toBe(false);
    expect(mockPlayer.playTrack).toHaveBeenCalledTimes(1);
    expect(guildPlayer.queue.current?.track.encoded).toBe('encoded_1');
  });
});
