'use client';

import type { CSSProperties } from 'react';

import styles from './AcademiaOSAnimatedLogo.module.css';

const LETTER_LAYERS = [
  'A',
  'c',
  'a1',
  'd',
  'e',
  'm',
  'i',
  'a2',
  'O',
  'S',
] as const;

type AcademiaOSAnimatedLogoProps = {
  className?: string;
  maxWidth?: number;
  showTagline?: boolean;
  style?: CSSProperties;
};

export function AcademiaOSAnimatedLogo({
  className = '',
  maxWidth = 420,
  showTagline = true,
  style,
}: AcademiaOSAnimatedLogoProps) {
  const variables = {
    '--academia-logo-max-width': `${maxWidth}px`,
  } as CSSProperties;

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ ...style, ...variables }}
      role="img"
      aria-label="AcademiaOS"
    >
      <span className={styles.stage} aria-hidden="true">
        {LETTER_LAYERS.map((letter) => (
          <img
            key={letter}
            src={`/brand/exact-wordmark/${letter}.png`}
            alt=""
            className={styles.layer}
          />
        ))}

        {showTagline ? (
          <img
            src="/brand/exact-wordmark/tagline.png"
            alt=""
            className={styles.layer}
          />
        ) : null}
      </span>
    </span>
  );
}

export default AcademiaOSAnimatedLogo;
