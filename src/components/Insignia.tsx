import React from 'react';

interface Props {
  size?: number;
  /** Text inside the badge (e.g. workspace initials). Without it, the Sermona "S" mark is drawn. */
  label?: string;
  /** Highlight with the amber signal colour */
  active?: boolean;
  className?: string;
  /** Hue for the badge face (used to tell workspaces apart) */
  tone?: 'amber' | 'steel' | 'cyan' | 'red' | 'olive' | 'violet';
}

const TONES: Record<NonNullable<Props['tone']>, [string, string]> = {
  amber: ['#ffbf47', '#c97a08'],
  steel: ['#7b8796', '#3a4350'],
  cyan: ['#6fd6fa', '#1b7fa8'],
  red: ['#ff7b7b', '#a82a2a'],
  olive: ['#b9c46a', '#5e6a1f'],
  violet: ['#a4b2ff', '#4a55b8'],
};

/**
 * Sermona's original hexagonal insignia, drawn in SVG.
 * Used as the brand mark and as workspace badges in the rail.
 */
export const Insignia: React.FC<Props> = ({ size = 44, label, active = false, className = '', tone = 'amber' }) => {
  const id = React.useId().replace(/:/g, '');
  const [c1, c2] = TONES[tone];
  const hex = 'M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z';
  const inner = 'M50 14 L81 32 L81 68 L50 86 L19 68 L19 32 Z';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`face-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a5563" />
          <stop offset="50%" stopColor="#1b222b" />
          <stop offset="100%" stopColor="#3a4450" />
        </linearGradient>
      </defs>

      {/* outer rim */}
      <path d={hex} fill={`url(#rim-${id})`} stroke={active ? '#ffb020' : '#556170'} strokeWidth={active ? 4 : 2} />
      {/* face */}
      <path d={inner} fill={`url(#face-${id})`} />
      {/* bevel highlight */}
      <path d="M50 14 L81 32 L50 50 L19 32 Z" fill="#fff" opacity="0.12" />
      {/* rivets */}
      {[
        [50, 9],
        [86, 30],
        [86, 70],
        [50, 91],
        [14, 70],
        [14, 30],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={active ? '#ffb020' : '#7c8795'} />
      ))}

      {label ? (
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          fontSize={label.length > 2 ? 22 : 28}
          fill="#0b0e12"
        >
          {label}
        </text>
      ) : (
        /* Stylised "S" built from two angular strokes */
        <path
          d="M64 32 H40 L34 38 V46 L40 52 H60 L66 58 V64 L60 70 H36"
          fill="none"
          stroke="#0b0e12"
          strokeWidth="8"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      )}
    </svg>
  );
};
