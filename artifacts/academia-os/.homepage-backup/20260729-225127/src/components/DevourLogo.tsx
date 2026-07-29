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

const HOLD_TIME = 2600;
const EAT_STEP_TIME = 170;
const EMPTY_PAUSE_TIME = 420;
const RESET_TIME = 140;

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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener?.('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener?.('change', updatePreference);
    };
  }, []);

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

    const resizeObserver = new ResizeObserver(measure);

    if (stageRef.current) resizeObserver.observe(stageRef.current);
    if (wordRef.current) resizeObserver.observe(wordRef.current);

    window.addEventListener('resize', measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase('hold');
      setEatenCount(0);
      return;
    }

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
  }, [eatenCount, phase, reducedMotion]);

  const eaterPosition = (() => {
    if (phase !== 'eat') return 0;

    if (eatenCount >= CHARACTERS.length) {
      return afterWordPosition;
    }

    return letterPositions[eatenCount] || 0;
  })();

  const stageClasses = [
    styles.stage,
    phase === 'hold' ? styles.holding : '',
    phase === 'eat' ? styles.eating : '',
    phase === 'reset' ? styles.resetting : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const colourVariables = {
    '--devour-academia': variant === 'light' ? '#fff8ea' : '#171a3b',
    '--devour-os': '#f4c542',
    '--devour-yellow': '#f4c542',
    '--devour-surface': variant === 'light' ? '#2f1d14' : '#ffffff',
  } as CSSProperties;

  return (
    <span
      ref={stageRef}
      className={stageClasses}
      role="img"
      aria-label="AcademiaOS."
      style={colourVariables}
    >
      <span ref={wordRef} className={styles.word} aria-hidden="true">
        {CHARACTERS.map((character, index) => {
          const hidden =
            !reducedMotion && phase === 'eat' && index < eatenCount;

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

      {!reducedMotion && phase !== 'reset' && (
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
