'use client';

import { useEffect, useRef } from 'react';

export function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cls = direction === 'left' ? 'reveal-left'
              : direction === 'right' ? 'reveal-right'
              : direction === 'scale' ? 'reveal-scale'
              : 'reveal';

    el.classList.add(cls);
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('in-view'); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return <div ref={ref} className={className}>{children}</div>;
}

// Staggered reveal for a list of children
export function StaggerReveal({ children, className = '', stagger = 80, direction = 'up' }: {
  children: React.ReactNode[];
  className?: string;
  stagger?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  return (
    <>
      {children.map((child, i) => (
        <ScrollReveal key={i} className={className} delay={i * stagger} direction={direction}>
          {child}
        </ScrollReveal>
      ))}
    </>
  );
}
