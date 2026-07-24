'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';

// Animated nav — slides down + logo pulses in
export function AnimatedNav({ user }: { user: { name: string } | null }) {
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const logo = logoRef.current;
    if (!nav || !logo) return;

    // Nav slides down
    nav.style.transform = 'translateY(-100%)';
    nav.style.opacity = '0';
    nav.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1), opacity .4s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nav.style.transform = 'translateY(0)';
        nav.style.opacity = '1';
      });
    });

    // Logo bounces in with a slight delay
    logo.style.transform = 'scale(0.6) rotate(-8deg)';
    logo.style.opacity = '0';
    logo.style.transition = 'transform .5s .25s cubic-bezier(.34,1.56,.64,1), opacity .3s .25s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        logo.style.transform = 'scale(1) rotate(0deg)';
        logo.style.opacity = '1';
      });
    });
  }, []);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-black/10 bg-[#2f1d14]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            ref={logoRef}
            className="relative h-9 w-9 transition-transform duration-300 group-hover:scale-105"
          >
            <Image
              src="/brand-logo.jpg"
              alt="AcademiaOS"
              fill
              unoptimized
              className="rounded-xl object-cover shadow"
            />
          </div>
          <span className="shimmer-text text-lg font-black tracking-tight">
            AcademiaOS
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {([['#features','Features'],['#daily-fees','Daily fees'],['#id-cards','Smart ID'],['#request','Request demo']] as const).map(([href, label]) => (
            <a key={href} href={href} className="text-sm font-bold text-white/70 transition hover:text-white">{label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary text-sm px-5 py-2.5">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white/70 transition hover:text-white sm:block">
                School sign in
              </Link>
              <a href="#request" className="btn-primary text-sm px-5 py-2.5">Request demo</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Animated hero text block — staggered fade-up after mount
export function HeroText({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity .7s ${delay}ms cubic-bezier(.16,1,.3,1), transform .7s ${delay}ms cubic-bezier(.16,1,.3,1)`;
    const t = setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 40);
    return () => clearTimeout(t);
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}
