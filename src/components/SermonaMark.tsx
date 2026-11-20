import React, { useId } from 'react';

export const SermonaMark: React.FC<{ size?: number }> = ({ size = 46 }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-letter`} x1="30" y1="20" x2="70" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4edff" />
          <stop offset="1" stopColor="#bca6db" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#11101f" stroke="#bca6db" strokeOpacity=".45" />
      <circle cx="50" cy="50" r="40" stroke="#bca6db" strokeOpacity=".12" />
      <text x="50" y="73" fill={`url(#${id}-letter)`} fontFamily="Baskerville, 'Palatino Linotype', Georgia, serif" fontSize="73" textAnchor="middle">S</text>
    </svg>
  );
};
