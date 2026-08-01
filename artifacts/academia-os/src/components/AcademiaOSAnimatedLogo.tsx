'use client';

import { type CSSProperties, useEffect, useId, useState } from 'react';

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

/*
 * Letter centres across the exact layered wordmark.
 * Y alternates around the middle of the letters to create
 * a visible horizontal left-to-right zig-zag.
 */
const EAT_PATH = [
  { x: 22.2, y: 60.8 },
  { x: 29.1, y: 56.8 },
  { x: 35.4, y: 63.6 },
  { x: 42.0, y: 56.8 },
  { x: 49.1, y: 63.6 },
  { x: 57.7, y: 56.8 },
  { x: 64.3, y: 63.6 },
  { x: 69.1, y: 56.8 },
  { x: 76.7, y: 63.6 },
  { x: 84.5, y: 59.2 },
] as const;

const REST_POSITION = { x: 19.2, y: 82.2 } as const;
const UNDER_LAST_POSITION = { x: 84.5, y: 82.2 } as const;

const HOLD_TIME = 1800;
const RISE_TIME = 500;
const BITE_TIME = 500;
const AFTER_EAT_TIME = 140;
const DROP_TIME = 380;
const RETURN_TIME = 1800;
const REBUILD_TIME = 150;
const SETTLE_TIME = 260;

type AnimationPhase =
  | 'hold'
  | 'rise'
  | 'eat'
  | 'drop'
  | 'return'
  | 'settle';

type AcademiaOSAnimatedLogoProps = {
  className?: string;
  maxWidth?: number;
  showTagline?: boolean;
  onDark?: boolean;
  style?: CSSProperties;
};

export function AcademiaOSAnimatedLogo({
  className = '',
  maxWidth = 420,
  showTagline = true,
  onDark = false,
  style,
}: AcademiaOSAnimatedLogoProps) {
  const maskId = useId().replace(/:/g, '');

  const [phase, setPhase] = useState<AnimationPhase>('hold');
  const [eatenCount, setEatenCount] = useState(0);
  const [rebuiltCount, setRebuiltCount] =
    useState(LETTER_LAYERS.length);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rebuildTimer: ReturnType<typeof setInterval> | undefined;

    if (phase === 'hold') {
      timer = setTimeout(() => {
        setEatenCount(0);
        setRebuiltCount(LETTER_LAYERS.length);
        setPhase('rise');
      }, HOLD_TIME);
    } else if (phase === 'rise') {
      timer = setTimeout(() => {
        setPhase('eat');
      }, RISE_TIME);
    } else if (phase === 'eat') {
      if (eatenCount < LETTER_LAYERS.length) {
        timer = setTimeout(() => {
          setEatenCount((current) => current + 1);
        }, BITE_TIME);
      } else {
        timer = setTimeout(() => {
          setPhase('drop');
        }, AFTER_EAT_TIME);
      }
    } else if (phase === 'drop') {
      timer = setTimeout(() => {
        setRebuiltCount(0);
        setPhase('return');
      }, DROP_TIME);
    } else if (phase === 'return') {
      rebuildTimer = setInterval(() => {
        setRebuiltCount((current) =>
          Math.min(current + 1, LETTER_LAYERS.length),
        );
      }, REBUILD_TIME);

      timer = setTimeout(() => {
        setRebuiltCount(LETTER_LAYERS.length);
        setPhase('settle');
      }, RETURN_TIME);
    } else {
      timer = setTimeout(() => {
        setEatenCount(0);
        setPhase('hold');
      }, SETTLE_TIME);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (rebuildTimer) clearInterval(rebuildTimer);
    };
  }, [eatenCount, phase]);

  let position = REST_POSITION;
  let rotation = -90;
  let travelTime = 0;

  if (phase === 'rise') {
    position = EAT_PATH[0];
    rotation = -90;
    travelTime = RISE_TIME;
  } else if (phase === 'eat') {
    position =
      EAT_PATH[
        Math.min(eatenCount, EAT_PATH.length - 1)
      ];

    rotation = 0;
    travelTime = BITE_TIME;
  } else if (phase === 'drop') {
    position = UNDER_LAST_POSITION;
    rotation = 90;
    travelTime = DROP_TIME;
  } else if (phase === 'return') {
    position = REST_POSITION;
    rotation = 180;
    travelTime = RETURN_TIME;
  } else if (phase === 'settle') {
    position = REST_POSITION;
    rotation = -90;
    travelTime = SETTLE_TIME;
  }

  const moving =
    phase === 'rise' ||
    phase === 'eat' ||
    phase === 'drop' ||
    phase === 'return';

  const variables = {
    '--academia-logo-max-width': `${maxWidth}px`,
    '--pacman-travel-time': `${travelTime}ms`,
    '--pacman-rotation': `${rotation}deg`,
  } as CSSProperties;

  const pacmanStyle = {
    left: `${position.x}%`,
    top: `${position.y}%`,
  } as CSSProperties;

  return (
    <span
      className={[
        styles.root,
        moving ? styles.moving : '',
        phase === 'eat' ? styles.eating : '',
        onDark ? styles.onDark : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...style, ...variables }}
      role="img"
      aria-label="AcademiaOS"
    >
      <span className={styles.stage} aria-hidden="true">
        {LETTER_LAYERS.map((letter, index) => {
          const visible =
            phase === 'return'
              ? index >= LETTER_LAYERS.length - rebuiltCount
              : phase === 'eat' || phase === 'drop'
                ? index >= eatenCount
                : true;

          return (
            <img
              key={letter}
              src={`/brand/exact-wordmark/${letter}.png`}
              alt=""
              className={[
                styles.layer,
                styles.letter,
                index < LETTER_LAYERS.length - 2
                  ? styles.academiaLetter
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                opacity: visible ? 1 : 0,
              }}
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
          className={styles.pacmanMover}
          style={pacmanStyle}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 100 100"
            className={styles.pacmanSvg}
            role="presentation"
          >
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="-10"
                y="-10"
                width="120"
                height="120"
              >
                <rect
                  x="-10"
                  y="-10"
                  width="120"
                  height="120"
                  fill="white"
                />

                <polygon
                  className={styles.mouthCutout}
                  points="48,50 110,13 110,87"
                  fill="black"
                />
              </mask>
            </defs>

            <circle
              cx="50"
              cy="50"
              r="47"
              fill="#f4c542"
              stroke="#a96f00"
              strokeWidth="4"
              mask={`url(#${maskId})`}
            />

            <circle
              cx="48"
              cy="24"
              r="5"
              fill="#171a3b"
            />
          </svg>

          <span className={styles.crumbs}>
            <span />
            <span />
            <span />
            <span />
          </span>
        </span>
      </span>
    </span>
  );
}

export default AcademiaOSAnimatedLogo;
