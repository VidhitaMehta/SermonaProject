import type { ChannelTheme } from '../types';

type Character = { name: string; handle: string; symbol: string };

export const CHARACTERS: Record<ChannelTheme, readonly Character[]> = {
  pokemon: [
    { name: 'Pikachu', handle: 'pikachu', symbol: '⚡' },
    { name: 'Eevee', handle: 'eevee', symbol: '🐾' },
    { name: 'Bulbasaur', handle: 'bulbasaur', symbol: '🌱' },
    { name: 'Charmander', handle: 'charmander', symbol: '🔥' },
    { name: 'Squirtle', handle: 'squirtle', symbol: '💧' },
    { name: 'Jigglypuff', handle: 'jigglypuff', symbol: '🎵' },
    { name: 'Snorlax', handle: 'snorlax', symbol: '💤' },
    { name: 'Gengar', handle: 'gengar', symbol: '👻' },
  ],
  avengers: [
    { name: 'Iron Man', handle: 'iron-man', symbol: '⚙️' },
    { name: 'Captain America', handle: 'captain-america', symbol: '🛡️' },
    { name: 'Thor', handle: 'thor', symbol: '⚡' },
    { name: 'Black Widow', handle: 'black-widow', symbol: '🕷️' },
    { name: 'Hulk', handle: 'hulk', symbol: '💪' },
    { name: 'Hawkeye', handle: 'hawkeye', symbol: '🏹' },
    { name: 'Scarlet Witch', handle: 'scarlet-witch', symbol: '🔮' },
    { name: 'Vision', handle: 'vision', symbol: '💎' },
  ],
  'harry-potter': [
    { name: 'Harry Potter', handle: 'harry-potter', symbol: '⚡' },
    { name: 'Hermione Granger', handle: 'hermione-granger', symbol: '📚' },
    { name: 'Ron Weasley', handle: 'ron-weasley', symbol: '♟️' },
    { name: 'Luna Lovegood', handle: 'luna-lovegood', symbol: '🌙' },
    { name: 'Neville Longbottom', handle: 'neville-longbottom', symbol: '🌿' },
    { name: 'Ginny Weasley', handle: 'ginny-weasley', symbol: '🪄' },
    { name: 'Rubeus Hagrid', handle: 'rubeus-hagrid', symbol: '🐉' },
    { name: 'Minerva McGonagall', handle: 'minerva-mcgonagall', symbol: '🐈' },
  ],
  whimsy: [
    { name: 'Mickey Mouse', handle: 'mickey-mouse', symbol: '🐭' },
    { name: 'Minnie Mouse', handle: 'minnie-mouse', symbol: '🎀' },
    { name: 'Stitch', handle: 'stitch', symbol: '🌺' },
    { name: 'Belle', handle: 'belle', symbol: '🌹' },
    { name: 'Rapunzel', handle: 'rapunzel', symbol: '🏮' },
    { name: 'Ariel', handle: 'ariel', symbol: '🐚' },
    { name: 'Tiana', handle: 'tiana', symbol: '🐸' },
    { name: 'Winnie the Pooh', handle: 'winnie-the-pooh', symbol: '🍯' },
  ],
};

export function getChannelIdentity(theme: ChannelTheme | undefined, memberId: string, preferredCharacter?: string) {
  if (!theme) return null;

  // Derive the identity from the sender ID so old messages and new messages agree.
  let hash = 2166136261;
  for (let index = 0; index < memberId.length; index++) {
    hash = Math.imul(hash ^ memberId.charCodeAt(index), 16777619);
  }

  const memberKey = hash >>> 0;
  const characters = CHARACTERS[theme];
  const character = characters.find((entry) => entry.handle === preferredCharacter) ?? characters[memberKey % characters.length];
  return { ...character, username: `@${character.handle}-${memberKey.toString(36)}` };
}
