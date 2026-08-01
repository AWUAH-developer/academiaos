'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AcademiaOSAnimatedLogo } from '@/components/AcademiaOSAnimatedLogo';

export function AnimatedNav({ user }: { user: { name: string } | null }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    nav.style.transform = 'translateY(-100%)';
    nav.style.opacity = '0';
    nav.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1), opacity .4s ease';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nav.style.transform = 'translateY(0)';
        nav.style.opacity = '1';
      });
    });
  }, []);

  return (
    <header ref={navRef} className="sticky top-0 z-50 border-b border-black/10 bg-[#2f1d14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="AcademiaOS home" className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-black/20">
            <Image src="/icon.svg" alt="" width={48} height={48} priority className="h-full w-full object-contain" />
          </div>
          <div className="flex w-[190px] min-w-0 flex-col items-stretch justify-center sm:w-[280px]">
            <AcademiaOSAnimatedLogo
              className="w-full max-w-full"
              maxWidth={280}
              showTagline={false}
              onDark
              style={{ transform: 'translateY(-9px)' }}
            />

            <span className="-mt-3 text-center text-[7px] font-black uppercase tracking-[0.2em] text-[#f4c542] sm:-mt-4 sm:text-[9px] sm:tracking-[0.24em]">
              School Command Centre
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          <Link href="/features" className="text-sm font-bold text-white/70 transition hover:text-white">Features</Link>
          <Link href="/pricing" className="text-sm font-bold text-white/70 transition hover:text-white">Packages</Link>
          <Link href="/#daily-fees" className="text-sm font-bold text-white/70 transition hover:text-white">Daily fees</Link>
          <Link href="/#id-cards" className="text-sm font-bold text-white/70 transition hover:text-white">Smart ID</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary px-4 py-2.5 text-sm sm:px-5">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white/70 transition hover:text-white md:block">School sign in</Link>
              <Link href="/pricing?type=demo#request" className="btn-primary px-4 py-2.5 text-sm sm:px-5">Request demo</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function HeroText({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(24px)';
    element.style.transition = `opacity .7s ${delay}ms cubic-bezier(.16,1,.3,1), transform .7s ${delay}ms cubic-bezier(.16,1,.3,1)`;

    const timer = setTimeout(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 40);

    return () => clearTimeout(timer);
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}
