import { DevourLogo } from '@/components/DevourLogo';

export const metadata = { title: 'AcademiaOS — Logo Preview' };

export default function LogoPreviewPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        padding: '40px 24px',
      }}
    >
      {/* Fixed-size overflow-hidden wrapper so the animation never bleeds out */}
      <div
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          // Wide enough to contain the full wordmark + eater
          minWidth: '14ch',
          padding: '8px 16px',
        }}
      >
        <DevourLogo className="text-5xl font-black" />
      </div>
    </main>
  );
}
