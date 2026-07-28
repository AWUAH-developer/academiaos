import React from 'react';

const WORD = 'AcademiaOS';

export default function SplashScreen() {
  return (
    <div className="desktop-splash" aria-label="Opening AcademiaOS">
      <div className="desktop-devour-logo" role="img" aria-label="AcademiaOS">
        <span className="desktop-devour-pacman" aria-hidden="true" />
        <span className="desktop-devour-word" aria-hidden="true">
          {WORD.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="desktop-devour-letter"
              style={{ '--devour-delay': `${0.4 + index * 0.078}s` } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
      </div>
      <div className="desktop-splash-tag">School Command Centre</div>
    </div>
  );
}
