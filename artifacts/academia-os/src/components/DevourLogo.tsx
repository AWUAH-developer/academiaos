'use client';

import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import styles from './DevourLogo.module.css';

const CHARACTERS = ['A', 'c', 'a', 'd', 'e', 'm', 'i', 'a', 'O', 'S'];

const HOLD_TIME = 2400;
const RISE_TIME = 320;
const EAT_STEP_TIME = 175;
const POST_EAT_PAUSE = 100;
const DROP_TIME = 280;
const RETURN_TIME = 1080;
const REBUILD_STEP_TIME = 90;
const SETTLE_TIME = 220;

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
  const stageRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const eaterRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const [phase, setPhase] = useState<AnimationPhase>('hold');
  const [eatenCount, setEatenCount] = useState(0);
  const [rebuiltCount, setRebuiltCount] = useState(CHARACTERS.length);
  const [letterPositions, setLetterPositions] = useState<Point[]>([]);
  const [restPosition, setRestPosition] = useState<Point>(ORIGIN);
  const [underLastPosition, setUnderLastPosition] =
    useState<Point>(ORIGIN);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const word = wordRef.current;
      const eater = eaterRef.current;

      if (!stage || !word || !eater) return;

      const stageBox = stage.getBoundingClientRect();
      const wordBox = word.getBoundingClientRect();
      const eaterBox = eater.getBoundingClientRect();
      const zigZagDistance = eaterBox.height * 0.13;

      const positions = letterRefs.current.map((letter, index) => {
        if (!letter) return ORIGIN;

        const letterBox = letter.getBoundingClientRect();

        const zigZagOffset =
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
            eaterBox.width / 2,
          y:
            letterBox.top -
            stageBox.top +
            letterBox.height / 2 -
            eaterBox.height / 2 +
            zigZagOffset,
        };
      });

      const firstLetterBox =
        letterRefs.current[0]?.getBoundingClientRect();

      const lastLetterBox =
        letterRefs.current[
          CHARACTERS.length - 1
        ]?.getBoundingClientRect();

      const underWordY = Math.min(
        stageBox.height - eaterBox.height - 1,
        wordBox.bottom - stageBox.top + eaterBox.height * 0.04,
      );

      setLetterPositions(positions);

      if (firstLetterBox) {
        setRestPosition({
          x:
            firstLetterBox.left -
            stageBox.left +
            firstLetterBox.width / 2 -
            eaterBox.width / 2,
          y: underWordY,
        });
      }

      if (lastLetterBox) {
        setUnderLastPosition({
          x:
            lastLetterBox.left -
            stageBox.left +
            lastLetterBox.width / 2 -
            eaterBox.width / 2,
          y: underWordY,
        });
      }
    };

    measure();

    const observer = new ResizeObserver(measure);

    if (stageRef.current) {
      observer.observe(stageRef.current);
    }

    if (wordRef.current) {
      observer.observe(wordRef.current);
    }

    window.addEventListener('resize', measure);

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
        }, POST_EAT_PAUSE);
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
            if (rebuildTimer) {
              clearInterval(rebuildTimer);
            }

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
      if (timer) {
        clearTimeout(timer);
      }

      if (rebuildTimer) {
        clearInterval(rebuildTimer);
      }
    };
  }, [eatenCount, phase]);

  const firstLetterPosition =
    letterPositions[0] || restPosition;

  const lastLetterPosition =
    letterPositions[CHARACTERS.length - 1] ||
    underLastPosition;

  let eaterPosition = restPosition;
  let eaterRotation = -90;
  let travelTime = 0;

  if (phase === 'rise') {
    eaterPosition = firstLetterPosition;
    eaterRotation = -90;
    travelTime = RISE_TIME;
  } else if (phase === 'eat') {
    eaterPosition =
      eatenCount >= CHARACTERS.length
        ? lastLetterPosition
        : letterPositions[eatenCount] ||
          firstLetterPosition;

    eaterRotation = 0;
    travelTime = EAT_STEP_TIME;
  } else if (phase === 'drop') {
    eaterPosition = underLastPosition;
    eaterRotation = 90;
    travelTime = DROP_TIME;
  } else if (phase === 'return') {
    eaterPosition = restPosition;
    eaterRotation = 180;
    travelTime = RETURN_TIME;
  } else if (phase === 'settle') {
    eaterPosition = restPosition;
    eaterRotation = 270;
    travelTime = SETTLE_TIME;
  }

  const moving =
    phase !== 'hold' && phase !== 'settle';

  const eating = phase === 'eat';

  const variables = {
    '--devour-academia':
      variant === 'light' ? '#fff8ea' : '#171a3b',
    '--devour-os': '#f4c542',
    '--devour-yellow': '#f4c542',
    '--devour-surface':
      variant === 'light' ? '#2f1d14' : '#ffffff',
    '--devour-travel-time': `${travelTime}ms`,
  } as CSSProperties;

  const eaterTransform =
    `translate3d(${eaterPosition.x}px, ` +
    `${eaterPosition.y}px, 0) ` +
    `rotate(${eaterRotation}deg)`;

  const crumbTransform =
    `translate3d(${eaterPosition.x}px, ` +
    `${eaterPosition.y}px, 0)`;

  return (
    <span
      ref={stageRef}
      className={[
        styles.stage,
        styles[phase],
        moving ? styles.moving : '',
        eating ? styles.eating : '',
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
              }}
            >
              {character}
            </span>
          );
        })}
      </span>

      <span
        ref={eaterRef}
        className={styles.eater}
        aria-hidden="true"
        style={{
          transform: eaterTransform,
        }}
      />

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
