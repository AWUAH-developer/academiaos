'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import Link from 'next/link';

import { Brand } from '@/components/Brand';

export function AnimatedNav({
  user,
}: {
  user: { name: string } | null;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;

    if (!nav) return;

    nav.style.transform = 'translateY(-100%)';
    nav.style.opacity = '0';
    nav.style.transition =
      'transform .55s cubic-bezier(.16,1,.3,1), opacity .4s ease';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nav.style.transform = 'translateY(0)';
        nav.style.opacity = '1';
      });
    });
  }, []);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-black/10 bg-[#2f1d14]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center">
          <Brand showTagline={false} variant="light" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {(
            [
              ['#features', 'Features'],
              ['#daily-fees', 'Daily fees'],
              ['#id-cards', 'Smart ID'],
              ['#request', 'Request demo'],
            ] as const
          ).map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-bold text-white/70 transition hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="btn-primary px-5 py-2.5 text-sm"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white/70 transition hover:text-white sm:block"
              >
                School sign in
              </Link>

              <a
                href="#request"
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Request demo
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function HeroText({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition =
      `opacity .7s ${delay}ms cubic-bezier(.16,1,.3,1), ` +
      `transform .7s ${delay}ms cubic-bezier(.16,1,.3,1)`;

    const timer = setTimeout(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 40);

    return () => clearTimeout(timer);
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}
