import Image from 'next/image';
import Link from 'next/link';
import {
  BadgeCheck, BookOpenCheck, BusFront, CircleDollarSign,
  ClipboardCheck, CreditCard, GraduationCap, LockKeyhole,
  Mail, Smartphone, Users, UsersRound,
} from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { DemoRequestForm } from '@/components/DemoRequestForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AcademiaOS — School Command Centre' };

const features = [
  { icon: UsersRound,       title: 'Admissions & Learners',    desc: 'Digital admission records, profile photos, class assignments, guardian contacts and payment plan configuration — all in one place.',                                                         color: 'bg-emerald-50 text-emerald-700' },
  { icon: ClipboardCheck,   title: 'Attendance & Daily Fees',  desc: 'Mark attendance in seconds. Daily-fee learners are charged automatically per day present. Missed days carry forward — nothing slips through.',                                                color: 'bg-amber-50 text-amber-700' },
  { icon: CircleDollarSign, title: 'Fees & Finance',           desc: 'Collect payments, generate official receipts and track outstanding balances. Term, monthly and daily fee plans all supported.',                                                               color: 'bg-blue-50 text-blue-700' },
  { icon: BookOpenCheck,    title: 'Academic Results',         desc: 'Teachers enter marks, headteachers review, proprietors approve. Results are locked until every level signs off.',                                                                               color: 'bg-violet-50 text-violet-700' },
  { icon: CreditCard,       title: 'Smart ID Cards',           desc: 'Print scannable ID cards for every staff member and learner. QR codes link directly to their profile for gate security and transport tracking.',                                               color: 'bg-rose-50 text-rose-700' },
  { icon: Users,            title: 'Parent & Guardian Portal', desc: 'Parents see attendance, fees, homework and results in real time. No WhatsApp chasing — everything is in the app.',                                                                             color: 'bg-teal-50 text-teal-700' },
];

const roles = ['School admin','Headteacher','Class teacher','Accounts officer','Receptionist','Transport officer','Security / gate','Parent / guardian'];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-[#fffdf7] font-sans antialiased">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#2f1d14]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/brand-logo.jpg" alt="AcademiaOS" width={38} height={38} unoptimized className="h-9 w-9 rounded-xl object-cover shadow" />
            <span className="text-lg font-black tracking-tight text-white">AcademiaOS</span>
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

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="wood-grain relative overflow-hidden px-5 py-24 text-white sm:px-8 sm:py-32">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full border-[60px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full border-[40px] border-white/5" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
            School command centre · v1.3.0
          </div>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Run every aspect of your school<br />
            <span className="text-[#d9a441]">from one secure platform.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/75">
            AcademiaOS connects admissions, attendance, daily fees, academic results, Smart ID cards, parent communication and mobile access — all under one login, with role-based security for every member of staff.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="#request" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#d9a441] px-7 py-3 text-base font-black text-[#2f1d14] shadow-lg transition hover:bg-amber-400">
              Request a demo for your school
            </a>
            <Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3 text-base font-bold text-white transition hover:bg-white/20">
              <LockKeyhole size={17} /> School sign in
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-bold text-white/60">
            {['Ghanaian curriculum ready','GHS & multi-currency','Works offline on desktop','Android & iOS apps'].map(f => (
              <span key={f} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#d9a441]"/>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES STRIP ──────────────────────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Built for</span>
          {roles.map(r => (
            <span key={r} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">{r}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="eyebrow">Everything in one system</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Complete school administration</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-500">Every module is connected. A payment updates the fee balance. An attendance mark triggers the daily fee charge. A result enters the approval workflow automatically.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="paper-card p-6">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAILY FEES SPOTLIGHT ─────────────────────────────────────────── */}
      <section id="daily-fees" className="scroll-mt-20 bg-[#1f5b45] px-5 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Attendance · Finance · Fees</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">Daily fees that actually add up.</h2>
            <p className="mt-5 text-lg leading-8 text-white/75">
              For schools charging per school day attended — AcademiaOS calculates the fee automatically when attendance is marked. Absent days are skipped. Holidays are skipped.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                ['Carry-forward logic','Any unpaid balance from the previous day is automatically carried forward — no manual chasing.'],
                ['Term, monthly & daily plans','Set a different payment plan per learner. The system handles the maths.'],
                ['Real-time balance','Accounts staff always see the live balance. No spreadsheets.'],
                ['Official PDF receipts','Every payment generates a printable, numbered receipt instantly.'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-4">
                  <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-[#d9a441] grid place-items-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#2f1d14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div><p className="font-black">{title}</p><p className="mt-0.5 text-sm text-white/65">{desc}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-12 lg:mt-0">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Example · Daily fee learner</p>
              <div className="mt-5 space-y-3">
                {[
                  ['Term days attended','42 days','text-white'],
                  ['Fee per day','GHS 12.50','text-white'],
                  ['Gross charge','GHS 525.00','text-white'],
                  ['Payments received','GHS 480.00','text-emerald-300'],
                  ['Balance carried forward','GHS 45.00','text-amber-300'],
                ].map(([label, value, cls]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-sm text-white/65">{label}</span>
                    <span className={`text-sm font-black ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/40">Calculated automatically. No spreadsheet needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SMART ID ─────────────────────────────────────────────────────── */}
      <section id="id-cards" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="flex flex-col gap-4 sm:flex-row">
              {[
                { label: 'STAFF',   name: 'Mrs. E. Asante', sub: 'Headteacher',         id: 'headteacher',    accent: 'bg-amber-700' },
                { label: 'LEARNER', name: 'Kofi Mensah',    sub: 'Primary 4 (Blue)',     id: 'ADM-2024-0042',  accent: 'bg-emerald-800' },
              ].map(card => (
                <div key={card.label} className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className={`${card.accent} flex items-center justify-between px-4 py-2`}>
                    <span className="text-xs font-black text-white">AcademiaOS School</span>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">{card.label}</span>
                  </div>
                  <div className="flex gap-3 p-4">
                    <div className="flex h-[80px] w-[62px] items-center justify-center rounded-xl bg-slate-100 text-2xl font-black text-slate-300">{card.name[0]}</div>
                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">{card.name}</p>
                        <p className="text-xs text-slate-500">{card.sub}</p>
                        <p className="mt-1 text-[10px] text-slate-400">ID: <span className="font-bold text-slate-600">{card.id}</span></p>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-[8px] uppercase tracking-widest text-slate-400">Scan to verify</p>
                        <div className="h-10 w-10 rounded border border-slate-200 bg-slate-50 grid place-items-center text-[6px] font-mono text-slate-300">QR</div>
                      </div>
                    </div>
                  </div>
                  <div className={`${card.accent} h-1.5`}/>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Identity & gate security</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Smart ID cards — print & scan.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-500">Every staff member and learner gets a scannable ID card. Print individually or in bulk. QR codes link directly to the person's record for gate security, transport tracking and attendance.</p>
            <ul className="mt-6 space-y-3">
              {['Staff (amber) and learner (green) cards are visually distinct','Print on any A4 printer — 2 per row','QR codes encode the unique badge ID','Filter by class or role before printing'].map(t => (
                <li key={t} className="flex items-start gap-3 text-sm text-slate-600">
                  <BadgeCheck size={18} className="mt-0.5 shrink-0 text-[#1f5b45]" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ROLE SECURITY ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="eyebrow">Access control</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Every staff member sees only what they need.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">14 role types from Super Admin to Canteen staff. Permissions are fixed by role — not configurable by accident.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {['Super admin','Proprietor','Headteacher','Academic admin','Class teacher','Accounts','Receptionist','Transport','Security / gate','Librarian','Canteen','Parent','Learner'].map(r => (
              <span key={r} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm">{r}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE & MULTI-CHANNEL ───────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-3 lg:gap-8">
          {[
            { icon: Smartphone,    title: 'Android & iOS apps',     desc: 'Native mobile apps for staff who need to work on the go. Attendance, approvals and messages — all from a phone.',                   color: 'bg-violet-100 text-violet-700' },
            { icon: GraduationCap, title: 'Desktop offline app',    desc: 'Electron-based desktop app for schools with unreliable internet. Data syncs when connection is restored.',                            color: 'bg-amber-100 text-amber-700' },
            { icon: Mail,          title: 'Built-in messaging',     desc: 'Secure internal messaging between staff and parents. No third-party apps needed — everything stays in the system.',                  color: 'bg-blue-100 text-blue-700' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="paper-card p-7 mt-6 lg:mt-0">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}><Icon size={24}/></div>
              <h3 className="mt-5 text-xl font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO REQUEST FORM ────────────────────────────────────────────── */}
      <section id="request" className="scroll-mt-20 wood-grain px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_480px] lg:items-start lg:gap-16">
          {/* Left — copy */}
          <div className="text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">For schools</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              Ready to run your school from one desk?
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Fill in the form and we will set up a demo for your school. You will receive login credentials to explore the full system before committing to anything.
            </p>

            <div className="mt-8 space-y-5">
              {[
                ['We set up your school','Your data, your staff, your classes — configured before you log in for the first time.'],
                ['You get real credentials','No demo sandbox — you see a live system with your school name and logo.'],
                ['Training included','We walk your administrator through every module before handover.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#d9a441] grid place-items-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#2f1d14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-white/65">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Already a school divider */}
            <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="font-black text-white">Already a school on AcademiaOS?</p>
              <p className="mt-1 text-sm text-white/65">Use the credentials your administrator provided.</p>
              <Link href="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#2f1d14] transition hover:bg-amber-50">
                <LockKeyhole size={15} /> School sign in
              </Link>
            </div>
          </div>

          {/* Right — form */}
          <div className="mt-10 rounded-3xl border border-white/15 bg-white p-8 shadow-2xl lg:mt-0">
            <h3 className="mb-6 text-xl font-black text-slate-900">Request a demo</h3>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-black/10 bg-[#2f1d14] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/brand-logo.jpg" alt="AcademiaOS" width={32} height={32} unoptimized className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-sm font-black text-white">AcademiaOS</span>
            <span className="text-xs text-white/40">School Command Centre</span>
          </div>
          <p className="text-xs text-white/40">Built for primary and secondary schools. © {new Date().getFullYear()} AcademiaOS.</p>
          <div className="flex gap-5">
            <Link href="/login" className="text-xs font-bold text-white/60 hover:text-white">School sign in</Link>
            <a href="mailto:hello@academiaos.cc" className="text-xs font-bold text-white/60 hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
