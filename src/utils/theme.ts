import { ColorResolvable } from 'discord.js';

export const ManorTheme = {
  colors: {
    primary: 0xd4af37 as ColorResolvable,
    secondary: 0x800020 as ColorResolvable,
    success: 0x2e8b57 as ColorResolvable,
    error: 0x8b0000 as ColorResolvable,
    info: 0x4682b4 as ColorResolvable,
  },
  emojis: {
    success: '🍷',
    error: '🥀',
    music: '🎻',
    money: '🪙',
    moderation: '📜',
    gate: '🏰',
    bot: '🎩',
    queue: '🎼',
  },
  borders: {
    top: '┌-⋆⋅✧⋅⋆-┐',
    bottom: '└-⋆⋅✧⋅⋆-┘',
  },
};
