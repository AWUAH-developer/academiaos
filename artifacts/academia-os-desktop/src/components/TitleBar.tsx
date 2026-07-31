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

function resolveLogoUrl(value?: string | null): string | null {
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

  const [logoSrc, setLogoSrc] = React.useState('./brand-logo.jpg');
  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLogoFailed(false);

    if (!resolvedLogoUrl) {
      setLogoSrc('./brand-logo.jpg');
      return () => {
        active = false;
      };
    }

    if (resolvedLogoUrl.startsWith('data:image/')) {
      setLogoSrc(resolvedLogoUrl);
      return () => {
        active = false;
      };
    }

    void media
      .loadImage(resolvedLogoUrl)
      .then((result) => {
        if (!active) return;

        setLogoSrc(
          result.ok ? result.dataUrl : resolvedLogoUrl,
        );
      })
      .catch(() => {
        if (active) setLogoSrc('./brand-logo.jpg');
      });

    return () => {
      active = false;
    };
  }, [resolvedLogoUrl]);

  function handleLogoError() {
    if (logoSrc !== './brand-logo.jpg') {
      setLogoSrc('./brand-logo.jpg');
      return;
    }

    setLogoFailed(true);
  }

  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar-left">
        <div
          className="desktop-titlebar-brand"
          aria-label="AcademiaOS"
        >
          {logoFailed ? (
            <span
              className="desktop-titlebar-logo-fallback"
              aria-hidden="true"
            >
              AOS
            </span>
          ) : (
            <img
              className="desktop-titlebar-logo"
              src={logoSrc}
              alt=""
              aria-hidden="true"
              onError={handleLogoError}
            />
          )}

          <span className="desktop-titlebar-wordmark">
            <span className="desktop-titlebar-academia">
              Academia
            </span>
            <span className="desktop-titlebar-os">OS</span>
          </span>
        </div>

        {schoolName && (
          <div className="desktop-titlebar-school">
            <span
              className="desktop-titlebar-school-badge"
              title={schoolName}
            >
              PLA
            </span>

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
          <span
            className="desktop-titlebar-user"
            title={userName}
          >
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
