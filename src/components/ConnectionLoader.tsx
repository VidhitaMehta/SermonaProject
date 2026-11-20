import React, { useId } from 'react';
import { SermonaLogo } from './SermonaLogo';

const PEOPLE = [
  { x: 103, y: 121, delay: 0, path: 'M103 121 Q200 75 320 220' },
  { x: 246, y: 61, delay: .6, path: 'M246 61 Q230 151 320 220' },
  { x: 438, y: 82, delay: 1.2, path: 'M438 82 Q450 180 320 220' },
  { x: 555, y: 165, delay: 1.8, path: 'M555 165 Q458 111 320 220' },
  { x: 521, y: 319, delay: 2.4, path: 'M521 319 Q401 372 320 220' },
  { x: 366, y: 376, delay: 3, path: 'M366 376 Q285 337 320 220' },
  { x: 165, y: 339, delay: 3.6, path: 'M165 339 Q162 223 320 220' },
  { x: 62, y: 240, delay: 4.2, path: 'M62 240 Q193 313 320 220' },
];

/** Decorative people and signal waves accompany the actual authentication state. */
export const ConnectionLoader: React.FC = () => {
  const id = useId().replace(/:/g, '');
  return (
    <section className="connection-loader" role="status" aria-live="polite" aria-label="Establishing link. Connecting to your workspace.">
      <div className="connection-brand"><SermonaLogo /></div>
      <div className="connection-art" aria-hidden="true">
        <svg viewBox="0 0 640 440" fill="none" focusable="false">
          <defs>
            <radialGradient id={`${id}-pearl`} cx=".35" cy=".25" r=".9">
              <stop stopColor="#201a32" />
              <stop offset="1" stopColor="#0b0d19" />
            </radialGradient>
            <linearGradient id={`${id}-monogram`} x1="298" y1="188" x2="339" y2="252" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f4edff" />
              <stop offset="1" stopColor="#bca6db" />
            </linearGradient>
            <radialGradient id={`${id}-halo`}>
              <stop stopColor="#9d8acf" stopOpacity=".18" />
              <stop offset="1" stopColor="#9d8acf" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-thread`} x1="50" y1="80" x2="560" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#91c9d1" stopOpacity=".4" />
              <stop offset=".5" stopColor="#c6aedf" stopOpacity=".65" />
              <stop offset="1" stopColor="#b482a7" stopOpacity=".35" />
            </linearGradient>
          </defs>
          <ellipse cx="320" cy="220" rx="260" ry="195" fill={`url(#${id}-halo)`} />
          <g className="connection-contours" stroke="#b7a3d2" strokeOpacity=".07">
            <ellipse cx="320" cy="220" rx="255" ry="166" transform="rotate(-18 320 220)" />
            <ellipse cx="320" cy="220" rx="205" ry="128" transform="rotate(24 320 220)" />
            <ellipse cx="320" cy="220" rx="142" ry="100" />
          </g>
          <g stroke={`url(#${id}-thread)`} strokeWidth="1">
            {PEOPLE.map((person) => <path key={person.path} d={person.path} />)}
            <path d="M103 121 Q213 7 438 82 M555 165 Q614 286 521 319 M165 339 Q256 418 366 376" strokeOpacity=".3" />
          </g>
          <g className="connection-waves" stroke="#c5b1e0" strokeWidth="1">
            {[0, 1, 2].map((index) => <circle key={index} className="connection-wave" cx="320" cy="220" r="55" style={{ animationDelay: `${index * 1.6}s` }} />)}
          </g>
          <g className="connection-signals">
            {PEOPLE.map((person) => (
              <circle key={person.path} r="2.5" fill="#e6d9fb">
                <animateMotion path={person.path} dur="4.8s" begin={`${person.delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur="4.8s" begin={`${person.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
          {PEOPLE.map((person) => (
            <g key={`${person.x}-${person.y}`} className="connection-person" style={{ animationDelay: `${person.delay}s` }}>
              <circle cx={person.x} cy={person.y} r="22" fill="#111323" stroke="#9b8eb6" strokeOpacity=".35" />
              <circle className="connection-node-pulse" cx={person.x} cy={person.y} r="27" stroke="#c0a6d9" strokeOpacity=".18" />
              <circle cx={person.x} cy={person.y - 4} r="4" fill="#c8bddb" />
              <path d={`M${person.x - 8} ${person.y + 8} Q${person.x - 8} ${person.y + 1} ${person.x} ${person.y + 1} Q${person.x + 8} ${person.y + 1} ${person.x + 8} ${person.y + 8}`} fill="#c8bddb" />
              <circle cx={person.x + 16} cy={person.y - 15} r="3" fill="#9fcac5" />
            </g>
          ))}
          <g className="connection-monogram">
            <circle cx="320" cy="220" r="62" stroke="#c8afdf" strokeOpacity=".15" />
            <circle cx="320" cy="220" r="55" fill={`url(#${id}-pearl)`} stroke="#bca6db" strokeOpacity=".45" />
            <circle cx="320" cy="220" r="48" stroke="#afa0c4" strokeOpacity=".25" />
            <text x="320" y="244" fill={`url(#${id}-monogram)`} fontFamily="Baskerville, 'Palatino Linotype', Georgia, serif" fontSize="76" textAnchor="middle">S</text>
          </g>
        </svg>
      </div>
      <div className="connection-caption" aria-hidden="true">
        <p className="connection-eyebrow"><span /> Establishing link<span className="connection-ellipsis">…</span></p>
        <h1>Bringing your people together.</h1>
        <p className="connection-description">Connecting to your workspace</p>
      </div>
    </section>
  );
};
