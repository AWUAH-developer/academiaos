import type { CSSProperties } from 'react';

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
      src="/brand/academiaos-pacman-animation.gif"
      alt={alt}
      width={960}
      height={370}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '960px',
        height: 'auto',
        objectFit: 'contain',
        marginLeft: 'auto',
        marginRight: 'auto',
        ...style,
      }}
    />
  );
}

export default AcademiaOSAnimatedLogo;
