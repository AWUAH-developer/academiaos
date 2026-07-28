'use client';

import type { CSSProperties } from 'react';

const WORD = 'AcademiaOS';

type DevourLogoProps = {
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
};

export function DevourLogo({ tone = 'light', compact = false, className = '' }: DevourLogoProps) {
  if (compact) {
    return (
      <span
        className={`devour-logo devour-logo--compact devour-logo--${tone} ${className}`.trim()}
        role="img"
        aria-label="AcademiaOS"
      >
        <span className="devour-pacman" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`devour-logo devour-logo--${tone} ${className}`.trim()}
      role="img"
      aria-label="AcademiaOS"
    >
      <span className="devour-pacman" aria-hidden="true" />
      <span className="devour-word" aria-hidden="true">
        {WORD.split('').map((letter, index) => (
          <span
            className="devour-letter"
            key={`${letter}-${index}`}
            style={{ '--devour-delay': `${0.4 + index * 0.078}s` } as CSSProperties}
          >
            {letter}
          </span>
        ))}
      </span>
    </span>
  );
}
