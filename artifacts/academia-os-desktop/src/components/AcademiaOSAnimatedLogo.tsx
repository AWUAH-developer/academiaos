import type { CSSProperties } from 'react';
import animationSource from '../assets/brand/academiaos-pacman-animation.gif';

type AcademiaOSAnimatedLogoProps = {
  className?: string;
  style?: CSSProperties;
  alt?: string;
};

export function AcademiaOSAnimatedLogo({
  className = '',
  style,
  alt = 'AcademiaOS animated logo',
}: AcademiaOSAnimatedLogoProps) {
  return (
    <img
      src={animationSource}
      alt={alt}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '960px',
        height: 'auto',
        objectFit: 'contain',
        marginInline: 'auto',
        ...style,
      }}
    />
  );
}

export default AcademiaOSAnimatedLogo;
