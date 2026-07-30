'use client';

import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import styles from './DevourLogo.module.css';

const CHARACTERS = ['A', 'c', 'a', 'd', 'e', 'm', 'i', 'a', 'O', 'S', '.'];

const HOLD_TIME = 2400;
const EAT_STEP_TIME = 150;
const EMPTY_PAUSE_TIME = 420;
const RESET_TIME = 150;

type AnimationPhase = 'hold' | 'eat' | 'reset';

type DevourLogoProps = {
  className?: string;
  variant?: 'light' | 'dark';
};

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
  const [letterPositions, setLetterPositions] = useState<number[]>([]);
  const [afterWordPosition, setAfterWordPosition] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const word = wordRef.current;
      const eater = eaterRef.current;

      if (!stage || !word) return;

      const stageBox = stage.getBoundingClientRect();
      const wordBox = word.getBoundingClientRect();
      const eaterWidth = eater?.getBoundingClientRect().width || 0;

      const positions = letterRefs.current.map((letter) => {
        if (!letter) return 0;

        const letterBox = letter.getBoundingClientRect();

        return (
          letterBox.left -
          stageBox.left +
          letterBox.width / 2 -
          eaterWidth / 2
        );
      });

      setLetterPositions(positions);
      setAfterWordPosition(
        wordBox.right - stageBox.left + Math.max(3, eaterWidth * 0.08),
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    if (stageRef.current) observer.observe(stageRef.current);
    if (wordRef.current) observer.observe(wordRef.current);

    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'hold') {
      timer = setTimeout(() => {
        setEatenCount(0);
        setPhase('eat');
      }, HOLD_TIME);
    } else if (phase === 'eat') {
      if (eatenCount < CHARACTERS.length) {
        timer = setTimeout(() => {
          setEatenCount((current) => current + 1);
        }, EAT_STEP_TIME);
      } else {
        timer = setTimeout(() => {
          setPhase('reset');
        }, EMPTY_PAUSE_TIME);
      }
    } else {
      timer = setTimeout(() => {
        setEatenCount(0);
        setPhase('hold');
      }, RESET_TIME);
    }

    return () => clearTimeout(timer);
  }, [eatenCount, phase]);

  const eaterPosition =
    phase === 'eat'
      ? eatenCount >= CHARACTERS.length
        ? afterWordPosition
        : letterPositions[eatenCount] || 0
      : 0;

  const variables = {
    '--devour-academia': variant === 'light' ? '#fff8ea' : '#171a3b',
    '--devour-os': '#f4c542',
    '--devour-yellow': '#f4c542',
    '--devour-surface': variant === 'light' ? '#2f1d14' : '#ffffff',
  } as CSSProperties;

  return (
    <span
      ref={stageRef}
      className={[
        styles.stage,
        phase === 'hold' ? styles.holding : '',
        phase === 'eat' ? styles.eating : '',
        phase === 'reset' ? styles.resetting : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label="AcademiaOS"
      style={variables}
    >
      <span ref={wordRef} className={styles.word} aria-hidden="true">
        {CHARACTERS.map((character, index) => {
          const hidden = phase === 'eat' && index < eatenCount;

          return (
            <span
              key={`${character}-${index}`}
              ref={(element) => {
                letterRefs.current[index] = element;
              }}
              className={[
                styles.letter,
                index >= 8 ? styles.osLetter : styles.academiaLetter,
              ].join(' ')}
              style={{ opacity: hidden ? 0 : 1 }}
            >
              {character}
            </span>
          );
        })}
      </span>

      {phase !== 'reset' && (
        <span
          ref={eaterRef}
          className={styles.eater}
          aria-hidden="true"
          style={{
            transform: `translate3d(${eaterPosition}px, -50%, 0)`,
          }}
        />
      )}
    </span>
  );
}
