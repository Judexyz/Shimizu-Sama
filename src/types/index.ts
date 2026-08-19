import { ChatInputCommandInteraction, ClientEvents, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

export type AnySlashCommandBuilder = 
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface Command {
  data: AnySlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Event<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}
