'use client';

import { BadgeCheck, CircleDollarSign, ClipboardCheck } from 'lucide-react';

function PingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} style={{ animationDuration: '2s' }} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

export function HeroCards() {
  return (
    <div className="relative h-[340px] w-full max-w-[460px] select-none" aria-hidden="true">

      {/* ── Decorative circles ── */}
      <div className="absolute right-8 top-4 h-56 w-56 rounded-full border-[36px] border-white/8 float-b" />
      <div className="absolute -left-4 bottom-8 h-32 w-32 rounded-full border-[20px] border-[#d9a441]/20 float-c" />

      {/* ── Card 1: Attendance marked ── */}
      <div
        className="float-a absolute left-0 top-8 w-[220px] overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl backdrop-blur-md"
        style={{ animationDelay: '0s' }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <ClipboardCheck size={18} className="text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PingDot color="bg-emerald-400" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">Attendance</p>
            </div>
            <p className="mt-0.5 truncate text-sm font-black text-white">42 of 44 learners</p>
            <p className="text-[11px] text-white/55">Primary 5 · marked just now</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-emerald-400/30 via-white/10 to-transparent" />
        <div className="px-4 py-2">
          <div className="flex gap-1.5">
            {[85, 70, 90, 60, 95, 80, 75].map((w, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-white/15">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-white/40">Daily attendance rate</p>
        </div>
      </div>

      {/* ── Card 2: Fee received ── */}
      <div
        className="float-b absolute right-0 top-[70px] w-[210px] overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl backdrop-blur-md"
        style={{ animationDelay: '1.2s' }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
            <CircleDollarSign size={18} className="text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PingDot color="bg-amber-400" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">Fee received</p>
            </div>
            <p className="mt-0.5 text-sm font-black text-white">GHS 850.00</p>
            <p className="truncate text-[11px] text-white/55">Mensah, K · Term 2 fees</p>
          </div>
        </div>
        <div className="mx-4 mb-3 mt-1 flex items-center justify-between rounded-xl bg-white/8 px-3 py-2">
          <span className="text-[11px] text-white/50">Balance remaining</span>
          <span className="text-xs font-black text-emerald-400">GHS 0.00</span>
        </div>
      </div>

      {/* ── Card 3: Result approved ── */}
      <div
        className="float-c absolute bottom-6 left-12 w-[230px] overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl backdrop-blur-md"
        style={{ animationDelay: '2.4s' }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
            <BadgeCheck size={18} className="text-violet-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PingDot color="bg-violet-400" />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-300">Result approved</p>
            </div>
            <p className="mt-0.5 text-sm font-black text-white">Term 2 results locked</p>
            <p className="text-[11px] text-white/55">Class 6A · proprietor approved</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-2xl bg-white/10">
          {[['A+','Maths','text-emerald-300'],['B','English','text-amber-300'],['A','Science','text-violet-300']].map(([grade, sub, cls]) => (
            <div key={sub} className="bg-white/8 px-2 py-2 text-center">
              <p className={`text-sm font-black ${cls}`}>{grade}</p>
              <p className="text-[9px] text-white/45">{sub}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
