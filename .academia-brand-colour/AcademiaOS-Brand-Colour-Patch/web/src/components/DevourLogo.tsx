'use client';

import { useEffect, useState } from 'react';

const WORD = 'AcademiaOS';
const HOLD_MS = 6000;
const EAT_STEP_MS = 110;
const EMPTY_PAUSE_MS = 220;
const WRITE_STEP_MS = 85;

type Mode = 'hold' | 'eat' | 'write';

type DevourLogoProps = {
  tone?: 'light' | 'dark';
  className?: string;
};

export function DevourLogo({ tone = 'light', className = '' }: DevourLogoProps) {
  const [mode, setMode] = useState<Mode>('hold');
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setMode('hold');
      setStep(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    if (mode === 'hold') {
      timer = setTimeout(() => {
        setStep(0);
        setMode('eat');
      }, HOLD_MS);
    } else if (mode === 'eat') {
      if (step < WORD.length) {
        timer = setTimeout(() => setStep((value) => value + 1), EAT_STEP_MS);
      } else {
        timer = setTimeout(() => {
          setStep(0);
          setMode('write');
        }, EMPTY_PAUSE_MS);
      }
    } else if (step < WORD.length) {
      timer = setTimeout(() => setStep((value) => value + 1), WRITE_STEP_MS);
    } else {
      timer = setTimeout(() => {
        setStep(0);
        setMode('hold');
      }, 250);
    }

    return () => clearTimeout(timer);
  }, [mode, reducedMotion, step]);

  const progress = mode === 'eat' ? Math.min(step / WORD.length, 1) : 0;

  return (
    <span
      className={`devour-logo devour-logo--${tone} ${className}`.trim()}
      role="img"
      aria-label="AcademiaOS"
    >
      <span className="devour-word" aria-hidden="true">
        {WORD.split('').map((letter, index) => {
          const visible =
            reducedMotion ||
            mode === 'hold' ||
            (mode === 'eat' ? index >= step : index < step);

          return (
            <span
              className={`devour-letter ${index < 8 ? 'devour-letter--academia' : 'devour-letter--os'}`}
              key={`${letter}-${index}`}
              style={{ opacity: visible ? 1 : 0 }}
            >
              {letter}
            </span>
          );
        })}
      </span>

      {!reducedMotion && mode === 'eat' && (
        <span
          className="devour-pacman"
          aria-hidden="true"
          style={{ left: `calc(${progress * 100}% - 0.42em)` }}
        />
      )}
    </span>
  );
}
