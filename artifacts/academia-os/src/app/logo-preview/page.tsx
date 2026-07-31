import { AcademiaOSAnimatedLogo } from '@/components/AcademiaOSAnimatedLogo';

export const metadata = {
  title: 'AcademiaOS — Logo Preview',
};

export default function LogoPreviewPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          width: 'min(960px, 100%)',
          marginInline: 'auto',
        }}
      >
        <AcademiaOSAnimatedLogo />
      </div>
    </main>
  );
}
