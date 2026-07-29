'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { DevourLogo } from '@/components/DevourLogo';

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 sm:px-8">
        <Link
          href="/"
          aria-label="AcademiaOS home"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-black/20">
            <Image
              src="/icon.svg"
              alt=""
              width={48}
              height={48}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          <div className="hidden w-[205px] overflow-hidden sm:block">
            <DevourLogo
              variant="light"
              className="text-[1.45rem] font-black"
            />
          </div>

          <div
            className="whitespace-nowrap text-lg font-black tracking-tight sm:hidden"
            aria-hidden="true"
          >
            <span className="text-[#fff8ea]">Academia</span>
            <span className="text-[#f4c542]">OS.</span>
          </div>
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

        <div className="flex shrink-0 items-center gap-3">
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
                className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white/70 transition hover:text-white lg:block"
              >
                School sign in
              </Link>

              <a
                href="#request"
                className="btn-primary px-4 py-2.5 text-sm sm:px-5"
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
    element.style.transform = 'translateY(24px)';
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
