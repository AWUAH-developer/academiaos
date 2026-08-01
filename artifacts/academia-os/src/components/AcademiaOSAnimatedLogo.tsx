'use client';

import { useEffect, useState } from 'react';
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

const LETTER_POSITIONS = [
  { x: 15.2, y: 78 },
  { x: 29.3, y: 78 },
  { x: 35.2, y: 78 },
  { x: 41.4, y: 78 },
  { x: 47.7, y: 78 },
  { x: 55.0, y: 78 },
  { x: 61.2, y: 78 },
  { x: 65.5, y: 78 },
  { x: 72.8, y: 78 },
  { x: 80.2, y: 78 },
] as const;

const HOLD_TIME = 1800;
const BITE_TIME = 850;
const RETURN_TIME = 3200;
const RESET_TIME = 900;
const START_POSITION = { x: 8, y: 78 } as const;

type AnimationPhase = 'hold' | 'eat' | 'return' | 'reset';

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

  const [phase, setPhase] = useState<AnimationPhase>('hold');
  const [eatenCount, setEatenCount] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'hold') {
      timer = setTimeout(() => {
        setEatenCount(0);
        setPhase('eat');
      }, HOLD_TIME);
    } else if (phase === 'eat') {
      if (eatenCount < LETTER_LAYERS.length) {
        timer = setTimeout(() => {
          setEatenCount((current) => current + 1);
        }, BITE_TIME);
      } else {
        timer = setTimeout(() => {
          setPhase('return');
        }, BITE_TIME);
      }
    } else if (phase === 'return') {
      timer = setTimeout(() => {
        setEatenCount(0);
        setPhase('reset');
      }, RETURN_TIME);
    } else {
      timer = setTimeout(() => {
        setPhase('hold');
      }, RESET_TIME);
    }

    return () => clearTimeout(timer);
  }, [eatenCount, phase]);

  const pacmanPosition =
    phase === 'hold' || phase === 'return' || phase === 'reset'
      ? START_POSITION
      : LETTER_POSITIONS[
          Math.min(eatenCount, LETTER_POSITIONS.length - 1)
        ];

  const travelTime =
    phase === 'return'
      ? RETURN_TIME
      : phase === 'eat'
        ? BITE_TIME
        : 0;

  const pacmanStyle = {
    left: `${pacmanPosition.x}%`,
    top: `${pacmanPosition.y}%`,
    opacity: phase === 'reset' ? 0 : 1,
    '--pacman-rotation': phase === 'return' ? '180deg' : '0deg',
    '--pacman-travel-time': `${travelTime}ms`,
  } as CSSProperties;

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ ...style, ...variables }}
      role="img"
      aria-label="AcademiaOS"
    >
      <span className={styles.stage} aria-hidden="true">
        {LETTER_LAYERS.map((letter, index) => {
          const hidden =
            (phase === 'eat' || phase === 'return') &&
            index < eatenCount;

          return (
            <img
              key={letter}
              src={`/brand/exact-wordmark/${letter}.png`}
              alt=""
              className={[styles.layer, styles.letter].join(' ')}
              style={{ opacity: hidden ? 0 : 1 }}
            />
          );
        })}

        {showTagline ? (
          <img
            src="/brand/exact-wordmark/tagline.png"
            alt=""
            className={styles.layer}
          />
        ) : null}

        <span
          className={styles.pacman}
          style={pacmanStyle}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 64 64"
            className={styles.pacmanSvg}
            role="presentation"
          >
            <path
              d="M32 32 L61 14 A30 30 0 1 1 61 50 Z"
              fill="#f4c542"
            />
            <circle cx="27" cy="18" r="3.2" fill="#171a3b" />
          </svg>
        </span>
      </span>
    </span>
  );
}

export default AcademiaOSAnimatedLogo;
