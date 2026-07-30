import React from 'react';

/**
 * Augment React.CSSProperties to include the Electron-specific
 * -webkit-app-region CSS property used for native window dragging.
 * This extension is file-scoped: it only affects this module.
 */
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

function resolveSchoolLogoUrl(value?: string | null) {
  const logo = String(value ?? '').trim();

  if (!logo || ['null', 'undefined', 'none'].includes(logo.toLowerCase())) {
    return null;
  }

  if (/^(data:|blob:|file:|https?:\/\/)/i.test(logo)) {
    return logo;
  }

  if (logo.startsWith('//')) {
    return `https:${logo}`;
  }

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
    () => resolveSchoolLogoUrl(schoolLogoUrl),
    [schoolLogoUrl],
  );
  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => {
    setLogoFailed(false);
  }, [resolvedLogoUrl, schoolName]);

  const showLogo = Boolean(resolvedLogoUrl && !logoFailed);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '.04em',
          }}
          aria-label="AcademiaOS"
        >
          <span style={{ color: '#fff8ea' }}>Academia</span>
          <span style={{ color: '#f4c542' }}>OS</span>
        </span>

        {schoolName && (
          <>
            <span style={{ opacity: 0.35 }}>·</span>

            {showLogo ? (
              <img
                key={resolvedLogoUrl ?? undefined}
                src={resolvedLogoUrl ?? undefined}
                alt={`${schoolName} logo`}
                onError={() => setLogoFailed(true)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  objectFit: 'contain',
                  background: '#fff',
                  padding: 2,
                }}
              />
            ) : (
              <span
                title={`${schoolName} initials logo`}
                aria-label={`${schoolName} initials logo`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#1F5C46',
                  color: '#F4C542',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '.04em',
                }}
              >
                {schoolInitials(schoolName)}
              </span>
            )}

            <span style={{ fontSize: 12, opacity: 0.75 }}>
              {schoolName}
            </span>
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          WebkitAppRegion: 'no-drag',
        }}
      >
        {userName && (
          <span style={{ fontSize: 12, opacity: 0.65 }}>
            {userName}
          </span>
        )}

        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255,255,255,.12)',
            border: 'none',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 4,
            fontSize: 11,
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
