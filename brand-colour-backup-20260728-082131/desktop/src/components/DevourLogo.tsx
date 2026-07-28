import React from 'react';

const WORD = 'AcademiaOS';
const HOLD_MS = 6000;
const EAT_STEP_MS = 110;
const EMPTY_PAUSE_MS = 220;
const WRITE_STEP_MS = 85;

type Mode = 'hold' | 'eat' | 'write';

export default function DevourLogo() {
  const [mode, setMode] = React.useState<Mode>('hold');
  const [step, setStep] = React.useState(0);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  React.useEffect(() => {
    if (reducedMotion) { setMode('hold'); setStep(0); return; }
    let timer: number;
    if (mode === 'hold') timer = window.setTimeout(() => { setStep(0); setMode('eat'); }, HOLD_MS);
    else if (mode === 'eat') {
      if (step < WORD.length) timer = window.setTimeout(() => setStep((value) => value + 1), EAT_STEP_MS);
      else timer = window.setTimeout(() => { setStep(0); setMode('write'); }, EMPTY_PAUSE_MS);
    } else if (step < WORD.length) timer = window.setTimeout(() => setStep((value) => value + 1), WRITE_STEP_MS);
    else timer = window.setTimeout(() => { setStep(0); setMode('hold'); }, 250);
    return () => window.clearTimeout(timer);
  }, [mode, reducedMotion, step]);

  const progress = mode === 'eat' ? Math.min(step / WORD.length, 1) : 0;

  return (
    <span className="desktop-login-devour" role="img" aria-label="AcademiaOS">
      <span className="desktop-login-word" aria-hidden="true">
        {WORD.split('').map((letter, index) => {
          const visible = reducedMotion || mode === 'hold' || (mode === 'eat' ? index >= step : index < step);
          return <span className="desktop-login-letter" key={`${letter}-${index}`} style={{ opacity: visible ? 1 : 0 }}>{letter}</span>;
        })}
      </span>
      {!reducedMotion && mode === 'eat' && <span className="desktop-login-pacman" aria-hidden="true" style={{ left: `calc(${progress * 100}% - 11px)` }}/>} 
    </span>
  );
}
