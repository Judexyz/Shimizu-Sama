import { Message } from 'discord.js';

export interface Violation {
  type: string;
  reason: string;
  context: Record<string, any>;
}

export interface DetectorContext {
  rule: any; // The database AutoModRule instance
  message: Message;
}

export interface Detector {
  type: string;
  detect(message: Message, context: DetectorContext): Promise<Violation | null>;
}
