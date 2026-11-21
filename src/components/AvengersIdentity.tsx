import React, { useId } from 'react';

const heroes: Record<string, { accent: string; secondary: string; element: string }> = {
  'iron-man': { accent: '#83edff', secondary: '#d79a43', element: 'Arc reactor' },
  'captain-america': { accent: '#8bbcff', secondary: '#ed626e', element: 'Vibranium shield' },
  thor: { accent: '#afeaff', secondary: '#728bff', element: 'Thunder & lightning' },
  'black-widow': { accent: '#ff7682', secondary: '#ab3345', element: 'Widow’s bite' },
  hulk: { accent: '#a4ee78', secondary: '#ac83de', element: 'Gamma energy' },
  hawkeye: { accent: '#c6a2ff', secondary: '#8266d2', element: 'Precision & focus' },
  'scarlet-witch': { accent: '#ff839c', secondary: '#d32e56', element: 'Chaos magic' },
  vision: { accent: '#ffe09a', secondary: '#db718e', element: 'Mind stone' },
};

export function heroStyle(handle?: string): React.CSSProperties {
  const hero = heroes[handle || 'iron-man'] || heroes['iron-man'];
  return { '--hero-accent': hero.accent, '--hero-secondary': hero.secondary } as React.CSSProperties;
}

export function AvengerEmblem({ handle, className = '' }: { handle: string; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={`avenger-emblem ${className}`} aria-hidden="true" fill="none">
      <defs>
        <radialGradient id={id}><stop stopColor="#354657"/><stop offset=".75" stopColor="#111b29"/><stop offset="1" stopColor="#060b12"/></radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={`url(#${id})`} stroke="#647180" strokeWidth="2"/>
      <circle cx="60" cy="60" r="49" stroke="currentColor" opacity=".35"/>
      <g stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {handle === 'captain-america' ? <><circle cx="60" cy="60" r="36" stroke="var(--hero-secondary)" strokeWidth="9"/><circle cx="60" cy="60" r="25"/><path d="m60 40 6 13 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2Z" fill="currentColor"/></> :
        handle === 'thor' ? <><path d="m37 30 43 8-5 24-43-8Z" fill="#536579"/><path d="m53 60-8 32 9 2 9-32"/><path className="hero-spark" d="m88 20-8 17 12-2-10 20M29 66l-8 17 12-2-5 17"/></> :
        handle === 'black-widow' ? <><path d="M38 30h44L38 90h44Z" fill="var(--hero-secondary)"/><path d="m27 40-8 20 8 20m66-40 8 20-8 20" opacity=".5"/></> :
        handle === 'hulk' ? <><path d="m34 74-9-24 9-5 8 13V35h11v19-25h12v25-22h12v25-17h11v31L73 90H45Z" fill="var(--hero-secondary)" fillOpacity=".35"/><path d="m21 89-7 9m80-18 11 5M25 25l-8-8"/></> :
        handle === 'hawkeye' ? <><path d="M39 24q54 36 0 72l18-36Z"/><path d="M25 60h67m-12-10 12 10-12 10M28 52l9 8-9 8"/></> :
        handle === 'scarlet-witch' ? <><path d="m24 32 13 47 23-15 23 15 13-47-20 20-16-14-16 14Z" fill="var(--hero-secondary)" fillOpacity=".4"/><path className="hero-spark" d="m60 70 8 13-8 13-8-13Z"/><path d="M25 19 16 40m79-21 9 21" opacity=".5"/></> :
        handle === 'vision' ? <><path d="m60 24 24 35-24 37-24-37Z" fill="var(--hero-secondary)" fillOpacity=".35"/><path d="m60 35 12 21-12 21-12-21Z" fill="currentColor"/><path d="M28 53v22l17 15m47-37v22L75 90"/></> :
        <><circle className="reactor-ring" cx="60" cy="60" r="35" strokeDasharray="12 5" strokeWidth="7"/><circle cx="60" cy="60" r="25"/><path d="m60 39 20 34H40Z" fill="currentColor" fillOpacity=".8"/></>}
      </g>
    </svg>
  );
}

export function AvengersBanner({ handle, name, channel, topic }: { handle: string; name: string; channel?: string; topic?: string }) {
  const hero = heroes[handle] || heroes['iron-man'];
  return (
    <section className={`avengers-banner hero-${handle}`} aria-label={`${name} channel theme`}>
      <div className="hero-orbit" aria-hidden="true"/>
      <div className="hero-energy" aria-hidden="true"/>
      <div className="avengers-banner-copy">
        <p className="hero-eyebrow">AVENGERS / ASSEMBLE</p>
        <h2>#{channel}</h2>
        {topic && <p className="hero-topic">{topic}</p>}
        <div className="hero-signature"><span/>{name}<span className="hero-element">{hero.element}</span></div>
      </div>
      <div className="hero-display"><AvengerEmblem handle={handle}/></div>
    </section>
  );
}
