'use client';

import { type CSSProperties, useEffect, useId, useState } from 'react';

import styles from './AcademiaOSAnimatedLogo.module.css';

type Phase = 'hold' | 'rise' | 'eat' | 'drop' | 'return' | 'rest';
type Direction = 'up' | 'right' | 'left';
type Point = { x: number; y: number };

const LETTERS = [
  { char: 'A', x: 58, tone: 'navy' },
  { char: 'c', x: 91, tone: 'navy' },
  { char: 'a', x: 122, tone: 'navy' },
  { char: 'd', x: 155, tone: 'navy' },
  { char: 'e', x: 190, tone: 'navy' },
  { char: 'm', x: 228, tone: 'navy' },
  { char: 'i', x: 270, tone: 'navy' },
  { char: 'a', x: 297, tone: 'navy' },
  { char: 'O', x: 333, tone: 'gold' },
  { char: 'S', x: 370, tone: 'gold' },
] as const;

const REST_POSITION = { x: 41, y: 103 } as const;
const RISE_POSITION = { x: 52, y: 78 } as const;

const EAT_PATH = [
  { x: 60, y: 58 },
  { x: 92, y: 50 },
  { x: 124, y: 58 },
  { x: 158, y: 50 },
  { x: 192, y: 58 },
  { x: 230, y: 50 },
  { x: 270, y: 58 },
  { x: 300, y: 50 },
  { x: 336, y: 58 },
  { x: 372, y: 50 },
] as const;

const DROP_POSITION = { x: 372, y: 103 } as const;

const RETURN_PATH = [
  { x: 340, y: 103 },
  { x: 292, y: 103 },
  { x: 244, y: 103 },
  { x: 196, y: 103 },
  { x: 148, y: 103 },
  { x: 102, y: 103 },
  { x: 66, y: 103 },
  { x: 41, y: 103 },
] as const;

const CRUMBS = [
  { dx: -10, dy: -3, size: 4, delay: 0 },
  { dx: -15, dy: -10, size: 5, delay: 35 },
  { dx: -20, dy: 2, size: 4, delay: 60 },
  { dx: -24, dy: -6, size: 3, delay: 95 },
  { dx: -29, dy: 6, size: 3, delay: 125 },
  { dx: -34, dy: -2, size: 2, delay: 155 },
  { dx: -18, dy: 10, size: 2, delay: 185 },
] as const;

const HOLD_TIME = 1800;
const RISE_TIME = 650;
const EAT_STEP_TIME = 340;
const EAT_FINISH_DELAY = 120;
const DROP_TIME = 320;
const RETURN_STEP_TIME = 220;
const SETTLE_TIME = 220;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AcademiaOSAnimatedLogo() {
  const [phase, setPhase] = useState<Phase>('hold');
  const [position, setPosition] = useState<Point>(REST_POSITION);
  const [eatenCount, setEatenCount] = useState(0);
  const [crumbBurstKey, setCrumbBurstKey] = useState(0);
  const maskId = useId().replace(/:/g, '');

  useEffect(() => {
    let cancelled = false;

    async function runAnimation() {
      setPhase('hold');
      setPosition(REST_POSITION);
      setEatenCount(0);
      setCrumbBurstKey(0);

      await wait(HOLD_TIME);
      if (cancelled) return;

      setPhase('rise');
      setPosition(RISE_POSITION);

      await wait(RISE_TIME);
      if (cancelled) return;

      setPhase('eat');

      for (let index = 0; index < EAT_PATH.length; index += 1) {
        if (cancelled) return;

        setPosition(EAT_PATH[index]!);
        setCrumbBurstKey(index + 1);

        await wait(EAT_STEP_TIME * 0.55);
        if (cancelled) return;

        setEatenCount(index + 1);

        await wait(EAT_STEP_TIME * 0.45);
      }

      await wait(EAT_FINISH_DELAY);
      if (cancelled) return;

      setPhase('drop');
      setPosition(DROP_POSITION);

      await wait(DROP_TIME);
      if (cancelled) return;

      setPhase('return');

      for (const point of RETURN_PATH) {
        if (cancelled) return;

        setPosition(point);
        await wait(RETURN_STEP_TIME);
      }

      if (cancelled) return;

      setPhase('rest');
      setPosition(REST_POSITION);

      await wait(SETTLE_TIME);
    }

    void runAnimation();

    return () => {
      cancelled = true;
    };
  }, []);

  const direction: Direction =
    phase === 'return'
      ? 'left'
      : phase === 'eat'
        ? 'right'
        : 'up';

  const pacmanStyle = {
    '--pacman-x': `${position.x}px`,
    '--pacman-y': `${position.y}px`,
  } as CSSProperties;

  return (
    <div className={styles.stage} aria-label="AcademiaOS animated logo">
      <svg
        viewBox="0 0 430 140"
        className={styles.wordmark}
        role="img"
        aria-label="AcademiaOS"
      >
        {LETTERS.map((letter, index) => (
          <text
            key={`${letter.char}-${index}`}
            x={letter.x}
            y={78}
            className={[
              styles.letter,
              letter.tone === 'gold' ? styles.gold : styles.navy,
              index < eatenCount ? styles.eaten : '',
            ].join(' ')}
          >
            {letter.char}
          </text>
        ))}
      </svg>

      <div className={styles.pacmanLayer} style={pacmanStyle} aria-hidden="true">
        <svg
          viewBox="0 0 36 36"
          className={[
            styles.pacman,
            styles[direction],
            phase === 'eat' || phase === 'return' ? styles.chomping : '',
          ].join(' ')}
        >
          <defs>
            <filter id={`${maskId}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
          </defs>

          <g filter={`url(#${maskId}-shadow)`}>
            <path
              className={styles.upperJaw}
              d="M18 18 L3 18 A15 15 0 0 1 33 18 Z"
            />
            <path
              className={styles.lowerJaw}
              d="M18 18 L33 18 A15 15 0 0 1 3 18 Z"
            />
            <circle cx="14.2" cy="10.3" r="1.8" className={styles.eye} />
          </g>
        </svg>

        <div
          key={crumbBurstKey}
          className={[
            styles.crumbCloud,
            phase === 'eat' ? styles.crumbCloudActive : '',
          ].join(' ')}
        >
          {CRUMBS.map((crumb, index) => (
            <span
              key={`${crumbBurstKey}-${index}`}
              className={styles.crumb}
              style={
                {
                  '--crumb-dx': `${crumb.dx}px`,
                  '--crumb-dy': `${crumb.dy}px`,
                  '--crumb-size': `${crumb.size}px`,
                  '--crumb-delay': `${crumb.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
