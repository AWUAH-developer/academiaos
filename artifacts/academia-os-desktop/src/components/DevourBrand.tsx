import React from 'react';

const WORD = 'AcademiaOS';
const HOLD_MS = 4300;
const EAT_STEP_MS = 115;
const EMPTY_PAUSE_MS = 220;
const WRITE_STEP_MS = 75;

type Mode = 'hold' | 'eat' | 'write';

export default function DevourBrand({ compact = false, holdMs = HOLD_MS }: { compact?: boolean; holdMs?: number }) {
  const [mode, setMode] = React.useState<Mode>('hold');
  const [step, setStep] = React.useState(0);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(Boolean(media?.matches));
    update();
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

  React.useEffect(() => {
    if (reducedMotion) {
      setMode('hold');
      setStep(0);
      return;
    }

    let timer: number;
    if (mode === 'hold') {
      timer = window.setTimeout(() => { setStep(0); setMode('eat'); }, holdMs);
    } else if (mode === 'eat') {
      if (step < WORD.length) timer = window.setTimeout(() => setStep((value) => value + 1), EAT_STEP_MS);
      else timer = window.setTimeout(() => { setStep(0); setMode('write'); }, EMPTY_PAUSE_MS);
    } else if (step < WORD.length) {
      timer = window.setTimeout(() => setStep((value) => value + 1), WRITE_STEP_MS);
    } else {
      timer = window.setTimeout(() => { setStep(0); setMode('hold'); }, 180);
    }
    return () => window.clearTimeout(timer);
  }, [holdMs, mode, reducedMotion, step]);

  const progress = mode === 'eat' ? Math.min(step / WORD.length, 1) : 0;

  return (
    <div className={`desktop-brand ${compact ? 'desktop-brand--compact' : ''}`} role="img" aria-label="AcademiaOS">
      <div className="desktop-brand-mark" aria-hidden="true">🎓</div>
      {!compact && (
        <div className="desktop-brand-word-wrap">
          <span className="desktop-brand-word" aria-hidden="true">
            {WORD.split('').map((letter, index) => {
              const visible = reducedMotion || mode === 'hold' || (mode === 'eat' ? index >= step : index < step);
              return <span key={`${letter}-${index}`} className="desktop-brand-letter" style={{ opacity: visible ? 1 : 0 }}>{letter}</span>;
            })}
          </span>
          {!reducedMotion && mode === 'eat' && (
            <span className="desktop-brand-pacman" aria-hidden="true" style={{ left: `calc(${progress * 100}% - 8px)` }} />
          )}
        </div>
      )}
    </div>
  );
}
