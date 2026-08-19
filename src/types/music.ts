import { Track } from 'shoukaku';

export interface MusicTrack {
  track: Track;
  requesterId: string;
  textChannelId: string; // Used to send 'Now Playing' messages
}

export enum LoopMode {
  NONE = 'NONE',
  TRACK = 'TRACK',
  QUEUE = 'QUEUE',
}

export enum PlayerState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}
