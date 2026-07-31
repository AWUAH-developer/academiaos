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
  if (source.length === 1) return source[0].slice(0, 3).toUpperCase();

  return source
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function resolveLogoUrl(value?: string | null) {
  const logo = String(value ?? '').trim();

  if (!logo || ['null', 'undefined', 'none'].includes(logo.toLowerCase())) {
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
  const [logoSrc, setLogoSrc] = React.useState<string | null>(null);
  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLogoSrc(null);
    setLogoFailed(false);

    if (!resolvedLogoUrl) {
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

    void media.loadImage(resolvedLogoUrl)
      .then((result) => {
        if (!active) return;
        setLogoSrc(result.ok ? result.dataUrl : resolvedLogoUrl);
      })
      .catch(() => {
        if (active) setLogoSrc(resolvedLogoUrl);
      });

    return () => {
      active = false;
    };
  }, [resolvedLogoUrl]);

  const showLogo = Boolean(logoSrc && !logoFailed);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--titlebar-h)',
        background: 'var(--chalk-dark)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        padding: '0 16px 0 80px',
      }}
    >
      {/* Left: AcademiaOS brand + school identity */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          minWidth: 0,
        }}
      >
        {/* AcademiaOS brand: graduation-cap icon + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
          aria-label="AcademiaOS"
        >
          <span
            style={{ fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            aria-hidden="true"
          >
            🎓
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '.03em',
              lineHeight: 1,
            }}
          >
            <span style={{ color: '#fff8ea' }}>Academia</span>
            <span style={{ color: '#f4c542' }}>OS</span>
          </span>
        </div>

        {/* School identity: logo + name */}
        {schoolName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginLeft: 18,
              paddingLeft: 18,
              borderLeft: '1px solid rgba(255,255,255,.22)',
              minWidth: 0,
            }}
          >
            {showLogo ? (
              <img
                src={logoSrc ?? undefined}
                alt={`${schoolName} logo`}
                onError={() => setLogoFailed(true)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  objectFit: 'contain',
                  background: '#fff',
                  padding: 3,
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                title={`${schoolName} logo unavailable`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(255,255,255,.12)',
                  color: '#f4c542',
                  fontSize: 13,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {schoolInitials(schoolName)}
              </span>
            )}

            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 260,
              }}
            >
              {schoolName}
            </span>
          </div>
        )}
      </div>

      {/* Right: username + sign out */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          WebkitAppRegion: 'no-drag',
          flexShrink: 0,
        }}
      >
        {userName && (
          <span style={{ fontSize: 13, opacity: 0.65 }}>{userName}</span>
        )}

        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
