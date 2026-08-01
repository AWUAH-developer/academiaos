'use client';

import {
  type CSSProperties,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import styles from './DevourLogo.module.css';

const CHARACTERS = ['A', 'c', 'a', 'd', 'e', 'm', 'i', 'a', 'O', 'S'];

const HOLD_TIME = 2200;
const RISE_TIME = 300;
const EAT_STEP_TIME = 165;
const AFTER_EAT_TIME = 90;
const DROP_TIME = 260;
const RETURN_TIME = 1000;
const REBUILD_STEP_TIME = 82;
const SETTLE_TIME = 180;

type AnimationPhase =
  | 'hold'
  | 'rise'
  | 'eat'
  | 'drop'
  | 'return'
  | 'settle';

type Point = {
  x: number;
  y: number;
};

type DevourLogoProps = {
  className?: string;
  variant?: 'light' | 'dark';
};

const ORIGIN: Point = { x: 0, y: 0 };

export function DevourLogo({
  className = '',
  variant = 'dark',
}: DevourLogoProps) {
  const maskId = useId().replace(/:/g, '');

  const stageRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const pacmanRef = useRef<SVGSVGElement>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const [phase, setPhase] = useState<AnimationPhase>('hold');
  const [eatenCount, setEatenCount] = useState(0);
  const [rebuiltCount, setRebuiltCount] = useState(CHARACTERS.length);
  const [letterPositions, setLetterPositions] = useState<Point[]>([]);
  const [restPosition, setRestPosition] = useState<Point>(ORIGIN);
  const [underLastPosition, setUnderLastPosition] =
    useState<Point>(ORIGIN);
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const word = wordRef.current;
      const pacman = pacmanRef.current;

      if (!stage || !word || !pacman) return;

      const stageBox = stage.getBoundingClientRect();
      const wordBox = word.getBoundingClientRect();
      const pacmanBox = pacman.getBoundingClientRect();

      const zigZagDistance = pacmanBox.height * 0.2;

      const positions = letterRefs.current.map((letter, index) => {
        if (!letter) return ORIGIN;

        const letterBox = letter.getBoundingClientRect();

        const zigZag =
          index === 0
            ? 0
            : index % 2 === 0
              ? zigZagDistance
              : -zigZagDistance;

        return {
          x:
            letterBox.left -
            stageBox.left +
            letterBox.width / 2 -
            pacmanBox.width / 2,
          y:
            letterBox.top -
            stageBox.top +
            letterBox.height / 2 -
            pacmanBox.height / 2 +
            zigZag,
        };
      });

      const firstLetterBox =
        letterRefs.current[0]?.getBoundingClientRect();

      const lastLetterBox =
        letterRefs.current[
          CHARACTERS.length - 1
        ]?.getBoundingClientRect();

      const underWordY = Math.min(
        stageBox.height - pacmanBox.height,
        wordBox.bottom - stageBox.top + 2,
      );

      if (firstLetterBox) {
        setRestPosition({
          x:
            firstLetterBox.left -
            stageBox.left +
            firstLetterBox.width * 0.16 -
            pacmanBox.width / 2,
          y: underWordY,
        });
      }

      if (lastLetterBox) {
        setUnderLastPosition({
          x:
            lastLetterBox.left -
            stageBox.left +
            lastLetterBox.width / 2 -
            pacmanBox.width / 2,
          y: underWordY,
        });
      }

      setLetterPositions(positions);
      setMeasured(true);
    };

    measure();

    const observer = new ResizeObserver(measure);

    if (stageRef.current) observer.observe(stageRef.current);
    if (wordRef.current) observer.observe(wordRef.current);

    window.addEventListener('resize', measure);

    document.fonts?.ready.then(measure).catch(() => undefined);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rebuildTimer: ReturnType<typeof setInterval> | undefined;

    if (phase === 'hold') {
      timer = setTimeout(() => {
        setEatenCount(0);
        setRebuiltCount(CHARACTERS.length);
        setPhase('rise');
      }, HOLD_TIME);
    } else if (phase === 'rise') {
      timer = setTimeout(() => {
        setPhase('eat');
      }, RISE_TIME);
    } else if (phase === 'eat') {
      if (eatenCount < CHARACTERS.length) {
        timer = setTimeout(() => {
          setEatenCount((current) => current + 1);
        }, EAT_STEP_TIME);
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
        setRebuiltCount((current) => {
          if (current >= CHARACTERS.length) {
            return current;
          }

          return current + 1;
        });
      }, REBUILD_STEP_TIME);

      timer = setTimeout(() => {
        setRebuiltCount(CHARACTERS.length);
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

  const firstLetterPosition =
    letterPositions[0] || restPosition;

  const lastLetterPosition =
    letterPositions[CHARACTERS.length - 1] ||
    underLastPosition;

  let pacmanPosition = restPosition;
  let pacmanRotation = -90;
  let travelTime = 0;

  if (phase === 'rise') {
    pacmanPosition = firstLetterPosition;
    pacmanRotation = -90;
    travelTime = RISE_TIME;
  } else if (phase === 'eat') {
    pacmanPosition =
      eatenCount >= CHARACTERS.length
        ? lastLetterPosition
        : letterPositions[eatenCount] ||
          firstLetterPosition;

    pacmanRotation = 0;
    travelTime = EAT_STEP_TIME;
  } else if (phase === 'drop') {
    pacmanPosition = underLastPosition;
    pacmanRotation = 90;
    travelTime = DROP_TIME;
  } else if (phase === 'return') {
    pacmanPosition = restPosition;
    pacmanRotation = 180;
    travelTime = RETURN_TIME;
  } else if (phase === 'settle') {
    pacmanPosition = restPosition;
    pacmanRotation = 270;
    travelTime = SETTLE_TIME;
  }

  const moving =
    phase === 'rise' ||
    phase === 'eat' ||
    phase === 'drop' ||
    phase === 'return';

  const variables = {
    '--devour-academia':
      variant === 'light' ? '#fff8ea' : '#171a3b',
    '--devour-os': '#f4c542',
    '--devour-yellow': '#f4c542',
    '--devour-travel-time': `${travelTime}ms`,
  } as CSSProperties;

  const pacmanTransform =
    `translate3d(${pacmanPosition.x}px, ` +
    `${pacmanPosition.y}px, 0) ` +
    `rotate(${pacmanRotation}deg)`;

  const crumbTransform =
    `translate3d(${pacmanPosition.x}px, ` +
    `${pacmanPosition.y}px, 0)`;

  return (
    <span
      ref={stageRef}
      className={[
        styles.stage,
        styles[phase],
        moving ? styles.moving : '',
        phase === 'eat' ? styles.eating : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label="AcademiaOS"
      style={variables}
    >
      <span
        ref={wordRef}
        className={styles.word}
        aria-hidden="true"
      >
        {CHARACTERS.map((character, index) => {
          const visible =
            phase === 'return'
              ? index < rebuiltCount
              : phase === 'eat' || phase === 'drop'
                ? index >= eatenCount
                : true;

          return (
            <span
              key={`${character}-${index}`}
              ref={(element) => {
                letterRefs.current[index] = element;
              }}
              className={[
                styles.letter,
                index >= 8
                  ? styles.osLetter
                  : styles.academiaLetter,
              ].join(' ')}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible
                  ? 'scale(1)'
                  : 'scale(0.88)',
              }}
            >
              {character}
            </span>
          );
        })}
      </span>

      <svg
        ref={pacmanRef}
        className={styles.pacman}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{
          opacity: measured ? 1 : 0,
          transform: pacmanTransform,
        }}
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
              points="48,50 108,14 108,86"
              fill="black"
            />
          </mask>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="48"
          fill="var(--devour-yellow)"
          mask={`url(#${maskId})`}
        />
      </svg>

      <span
        className={styles.crumbField}
        aria-hidden="true"
        style={{
          transform: crumbTransform,
        }}
      >
        <span className={styles.crumb} />
        <span className={styles.crumb} />
        <span className={styles.crumb} />
        <span className={styles.crumb} />
      </span>
    </span>
  );
}
