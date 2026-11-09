import type { ChannelTheme } from '../types';

export const CHANNEL_THEMES: { id: ChannelTheme; name: string; description: string; greeting: string; symbol: string; colors: string[] }[] = [
  { id: 'pokemon', name: 'Pokémon', description: 'Electric yellow, Poké Ball red, and adventure-ready blue.', greeting: 'A new adventure in', symbol: 'ϟ', colors: ['#ffdf59', '#f16b72', '#192d55'] },
  { id: 'avengers', name: 'Avengers', description: 'Midnight armor, arc-reactor cyan, and heroic red.', greeting: 'Assemble in', symbol: 'A', colors: ['#6de5ff', '#ff777d', '#102033'] },
  { id: 'harry-potter', name: 'Harry Potter', description: 'Enchanted gold, rich burgundy, and a starry common room.', greeting: 'A little magic in', symbol: '✧', colors: ['#f5d38b', '#b65d78', '#241b34'] },
  { id: 'whimsy', name: 'Whimsy & Soft', description: 'Airy lavender, rosewater, and soft cloud-like surfaces.', greeting: 'Make yourself at home in', symbol: '✿', colors: ['#7951aa', '#d892b6', '#f9f4fc'] },
];

/** Unknown or legacy values fall back to the original workspace appearance. */
export const getChannelTheme = (value: unknown) => CHANNEL_THEMES.find((theme) => theme.id === value) ?? null;
