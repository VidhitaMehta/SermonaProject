import React, { useId } from 'react';
import { BookOpen, Cat, Crown, Flame, Leaf, Moon, Music, PawPrint, Sparkles, WandSparkles, Waves, Zap, Ghost, CloudMoon, Shield } from 'lucide-react';

type FantasyTheme = 'pokemon' | 'harry-potter';
const signatures = {
  pikachu: ['#ffe37d', '#dca637', 'Electric', Zap],
  eevee: ['#eac69d', '#b77c4b', 'Evolution', PawPrint],
  bulbasaur: ['#98e0b0', '#58ae87', 'Grass · Poison', Leaf],
  charmander: ['#ffb583', '#ec6749', 'Fire', Flame],
  squirtle: ['#9ddfff', '#589fdc', 'Water', Waves],
  jigglypuff: ['#ffc0e0', '#d98ac1', 'Fairy · Melody', Music],
  snorlax: ['#a4d9d2', '#629fa7', 'Rest & recharge', CloudMoon],
  gengar: ['#c9a4ff', '#9660ce', 'Ghost · Poison', Ghost],
  'harry-potter': ['#edcc86', '#ba6670', 'The Chosen One', Zap],
  'hermione-granger': ['#f3d8a2', '#bc8e62', 'Knowledge & courage', BookOpen],
  'ron-weasley': ['#efb58a', '#b56c64', 'Strategy & loyalty', Crown],
  'luna-lovegood': ['#bfc8ff', '#9593d2', 'Wonder & imagination', Moon],
  'neville-longbottom': ['#b9df9a', '#799f63', 'Herbology & courage', Leaf],
  'ginny-weasley': ['#ffa99a', '#bd6b79', 'Fierce enchantment', WandSparkles],
  'rubeus-hagrid': ['#dbc5a3', '#928064', 'Keeper of creatures', PawPrint],
  'minerva-mcgonagall': ['#a5dcc2', '#739b99', 'Transfiguration', Cat],
} as const;

function signature(theme: FantasyTheme, handle?: string) {
  return signatures[handle as keyof typeof signatures] || signatures[theme === 'pokemon' ? 'pikachu' : 'harry-potter'];
}

export function fantasyStyle(theme: FantasyTheme, handle?: string): React.CSSProperties {
  const [accent, secondary] = signature(theme, handle);
  return { '--hero-accent': accent, '--hero-secondary': secondary } as React.CSSProperties;
}

export function FantasyEmblem({ theme, handle }: { theme: FantasyTheme; handle: string }) {
  const [, , , Icon] = signature(theme, handle);
  const id = useId();
  return <svg viewBox="0 0 120 120" className="fantasy-emblem" fill="none" aria-hidden="true">
    <defs><radialGradient id={id}><stop stopColor="var(--hero-secondary)" stopOpacity=".35"/><stop offset="1" stopColor={theme === 'pokemon' ? '#101f29' : '#201b2c'}/></radialGradient></defs>
    <circle cx="60" cy="60" r="55" fill={`url(#${id})`} stroke="var(--hero-secondary)" strokeWidth="2"/>
    {theme === 'pokemon' ? <><path d="M8 60h104" stroke="currentColor" opacity=".4"/><circle cx="60" cy="60" r="45" stroke="currentColor" strokeDasharray="3 8" opacity=".3"/><circle cx="60" cy="60" r="32" fill="#101c29" stroke="currentColor" strokeWidth="2"/></> : <><path d="m60 8 43 24v40L60 111 17 72V32Z" stroke="currentColor" opacity=".55"/><circle cx="60" cy="60" r="39" stroke="currentColor" strokeDasharray="1 7" opacity=".4"/><path d="m28 19 2 7 7 2-7 2-2 7-2-7-7-2 7-2m67 58 2 7 7 2-7 2-2 7-2-7-7-2 7-2" fill="currentColor"/></>}
    <Icon x="39" y="39" width="42" height="42" strokeWidth="1.5" color="currentColor"/>
  </svg>;
}

export function FantasyBanner({ theme, handle, name, channel, topic }: { theme: FantasyTheme; handle: string; name: string; channel?: string; topic?: string }) {
  const [, , element] = signature(theme, handle);
  const pokemon = theme === 'pokemon';
  return <section className={`avengers-banner fantasy-banner fantasy-${theme} fantasy-character-${handle}`} aria-label={`${name} channel theme`}>
    <div className="fantasy-scenery" aria-hidden="true">
      {pokemon ? <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMax slice"><path d="M0 200 90 95 170 170 290 50 400 174 490 92 600 180V220H0Z"/><path d="M0 216q140-80 300-5t300-25v34H0Z"/></svg> : <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMax slice"><path d="M290 220V130h22V76l14-25 14 25v54h20V98l12-20 12 20v54h25V66l17-32 17 32v70h22V105l12-23 12 23v50h27v65Z"/><circle cx="493" cy="40" r="18"/></svg>}
    </div>
    <div className="fantasy-particles" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${8 + i * 10}%`, top: `${18 + (i * 17) % 65}%`, animationDelay: `${i * -.7}s` }}/>)}</div>
    <div className="avengers-banner-copy">
      <p className="hero-eyebrow">{pokemon ? 'POKÉMON / A NEW ADVENTURE' : 'HOGWARTS / A LITTLE MAGIC'}</p>
      <h2>#{channel}</h2>
      {topic && <p className="hero-topic">{topic}</p>}
      <div className="hero-signature"><span/>{name}<span className="hero-element">{element}</span></div>
    </div>
    <div className="hero-display fantasy-display"><FantasyEmblem theme={theme} handle={handle}/>{pokemon ? <Shield className="fantasy-orbit-icon" aria-hidden="true"/> : <Sparkles className="fantasy-orbit-icon" aria-hidden="true"/>}</div>
  </section>;
}
