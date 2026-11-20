import React from 'react';
import logo from '../assets/sermona-logo.png';

/** Display the supplied artwork, framing out the screenshot's white margins. */
export const SermonaLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`sermona-logo ${className}`}>
    <img src={logo} alt="Sermona — The art of organised thought" />
  </div>
);
