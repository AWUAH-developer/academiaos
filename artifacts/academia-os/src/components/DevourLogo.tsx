'use client';

import { useEffect, useState, CSSProperties } from 'react';

// Each character of the wordmark including the terminal dot
const CHARS = ['A', 'c', 'a', 'd', 'e', 'm', 'i', 'a', 'O', 'S', '.'];

// Timing
const HOLD_MS = 5000;       // how long the full wordmark rests before eating starts
const EAT_STEP_MS = 115;    // ms per character eaten
const EMPTY_PAUSE_MS = 380; // pause after all eaten, before rebuild
const WRITE_STEP_MS = 62;   // ms per character written back
const FINISH_PAUSE_MS = 480;// pause after rebuild, before going back to hold

type Mode = 'hold' | 'eat' | 'write';

// Characters 8–10 (O, S, .) are yellow; 0–7 (Academia) use the accent colour
function isYellow(index: number) {
  return index >= 8;
}

export function DevourLogo({
  className = '',
  variant = 'dark',
}: {
  className?: string;
  /** 'light' = cream Academia letters, for dark surfaces (nav, hero)
   *  'dark'  = navy Academia letters, for light surfaces (logo-preview)
   *  Default is 'dark' to preserve existing logo-preview behaviour. */
  variant?: 'light' | 'dark';
}) {
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
      // Hold the full wordmark, then start eating
      timer = setTimeout(() => {
        setStep(0);
        setMode('eat');
      }, HOLD_MS);
    } else if (mode === 'eat') {
      if (step < CHARS.length) {
        // Advance eater one character at a time
        timer = setTimeout(() => setStep((v) => v + 1), EAT_STEP_MS);
      } else {
        // All eaten — brief pause, then rebuild
        timer = setTimeout(() => {
          setStep(0);
          setMode('write');
        }, EMPTY_PAUSE_MS);
      }
    } else {
      // write mode — reveal characters one at a time (typewriter)
      if (step < CHARS.length) {
        timer = setTimeout(() => setStep((v) => v + 1), WRITE_STEP_MS);
      } else {
        // Fully rebuilt — pause, then go back to hold
        timer = setTimeout(() => {
          setStep(0);
          setMode('hold');
        }, FINISH_PAUSE_MS);
      }
    }

    return () => clearTimeout(timer);
  }, [mode, step, reducedMotion]);

  // Is character at `index` visible right now?
  const isVisible = (index: number): boolean => {
    if (reducedMotion) return true;
    if (mode === 'hold') return true;
    if (mode === 'eat') return index >= step;   // chars ahead of eater are still visible
    // write mode — chars written so far are visible
    return index < step;
  };

  // Should the eater (pacman) appear immediately BEFORE character at `index`?
  // In hold mode → always before index 0 (left of A)
  // In eat mode → before the next character to be eaten (index === step)
  const showEaterBefore = (index: number): boolean => {
    if (reducedMotion) return false;
    if (mode === 'hold' && index === 0) return true;
    if (mode === 'eat' && index === step && step < CHARS.length) return true;
    return false;
  };

  // When all characters are eaten (step === CHARS.length in eat mode),
  // show the eater after the last character
  const showEaterAfterAll =
    !reducedMotion && mode === 'eat' && step === CHARS.length;

  return (
    <span
      className={`devour-logo ${className}`.trim()}
      role="img"
      aria-label="AcademiaOS."
      style={
        {
          '--devour-academia': variant === 'light' ? '#fff8ea' : '#171a3b',
        } as CSSProperties
      }
    >
      <span className="devour-word" aria-hidden="true">
        {CHARS.map((char, index) => (
          <span key={index} className="devour-char-slot">
            {showEaterBefore(index) && (
              <span className="devour-pacman" aria-hidden="true" />
            )}
            <span
              className={`devour-letter ${
                isYellow(index) ? 'devour-letter--os' : 'devour-letter--academia'
              }`}
              style={{ opacity: isVisible(index) ? 1 : 0 }}
            >
              {char}
            </span>
          </span>
        ))}
        {showEaterAfterAll && (
          <span className="devour-pacman devour-pacman--after" aria-hidden="true" />
        )}
      </span>
    </span>
  );
}
