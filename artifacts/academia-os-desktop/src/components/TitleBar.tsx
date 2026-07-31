import React from 'react';
import { media } from '../api/client';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

interface Props {
  schoolName?: string;
  schoolLogoUrl?: string | null;
  userName?: string;
  onLogout(): void;
}

function schoolInitials(name: string) {
  const ignored = new Set(['and', 'of', 'the', '&']);
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const meaningful = words.filter(
    (word) => !ignored.has(word.toLowerCase()),
  );

  const source = meaningful.length ? meaningful : words;

  if (!source.length) return 'SCH';
  if (source.length === 1) {
    return source[0].slice(0, 3).toUpperCase();
  }

  return source
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function resolveLogoUrl(value?: string | null) {
  const logo = String(value ?? '').trim();

  if (
    !logo ||
    ['null', 'undefined', 'none'].includes(logo.toLowerCase())
  ) {
    return null;
  }

  if (/^(data:|https?:\/\/)/i.test(logo)) return logo;
  if (logo.startsWith('//')) return `https:${logo}`;

  try {
    return new URL(logo, 'https://academiaos.cc').toString();
  } catch {
    return null;
  }
}

export default function TitleBar({
  schoolName,
  schoolLogoUrl,
  userName,
  onLogout,
}: Props) {
  const resolvedLogoUrl = React.useMemo(
    () => resolveLogoUrl(schoolLogoUrl),
    [schoolLogoUrl],
  );

  const [schoolLogoSrc, setSchoolLogoSrc] =
    React.useState<string | null>(null);

  const [schoolLogoFailed, setSchoolLogoFailed] =
    React.useState(false);

  React.useEffect(() => {
    let active = true;

    setSchoolLogoSrc(null);
    setSchoolLogoFailed(false);

    if (!resolvedLogoUrl) {
      return () => {
        active = false;
      };
    }

    if (resolvedLogoUrl.startsWith('data:image/')) {
      setSchoolLogoSrc(resolvedLogoUrl);

      return () => {
        active = false;
      };
    }

    void media
      .loadImage(resolvedLogoUrl)
      .then((result) => {
        if (!active) return;

        setSchoolLogoSrc(
          result.ok ? result.dataUrl : resolvedLogoUrl,
        );
      })
      .catch(() => {
        if (active) {
          setSchoolLogoSrc(resolvedLogoUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedLogoUrl]);

  const showSchoolLogo = Boolean(
    schoolLogoSrc && !schoolLogoFailed,
  );

  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar-left">
        <div
          className="desktop-titlebar-brand"
          aria-label="AcademiaOS"
        >
          <img
            className="desktop-titlebar-app-logo"
            src="./brand-logo.jpg"
            alt=""
            aria-hidden="true"
          />

          <span className="desktop-titlebar-wordmark">
            <span className="desktop-titlebar-academia">
              Academia
            </span>
            <span className="desktop-titlebar-os">OS</span>
            <sup className="desktop-titlebar-trademark">™</sup>
          </span>
        </div>

        {schoolName && (
          <div className="desktop-titlebar-school">
            {showSchoolLogo ? (
              <img
                className="desktop-titlebar-school-logo"
                src={schoolLogoSrc ?? undefined}
                alt={`${schoolName} logo`}
                onError={() => setSchoolLogoFailed(true)}
              />
            ) : (
              <span
                className="desktop-titlebar-school-fallback"
                title={`${schoolName} logo unavailable`}
              >
                {schoolInitials(schoolName)}
              </span>
            )}

            <span
              className="desktop-titlebar-school-name"
              title={schoolName}
            >
              {schoolName}
            </span>
          </div>
        )}
      </div>

      <div className="desktop-titlebar-account">
        {userName && (
          <span className="desktop-titlebar-user">
            {userName}
          </span>
        )}

        <button
          type="button"
          className="desktop-titlebar-logout"
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
