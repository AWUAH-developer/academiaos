import Image from 'next/image';
import Link from 'next/link';
import {
  BadgeCheck, BookOpenCheck, BusFront, CalendarDays, CircleDollarSign, ClipboardCheck, CreditCard, FileBarChart, Gauge,
  GraduationCap, Headphones, Inbox, KeyRound, ListChecks, LogOut, Mail, Package, School, ScrollText, Settings2,
  Users, UsersRound, UserCheck
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { Brand } from '@/components/Brand';
import { SchoolBadge } from '@/components/SchoolBadge';
import { navigationByRole } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';

const navItems = {
  dashboard: { href: '/dashboard', label: 'Dashboard', icon: Gauge }, schools: { href: '/schools', label: 'Schools', icon: School },
  users: { href: '/users', label: 'Users & staff', icon: Users },
  guardians: { href: '/guardians', label: 'Parents & guardians', icon: UsersRound },
  setup: { href: '/setup', label: 'School setup', icon: Settings2 },
  learners: { href: '/learners', label: 'Learners', icon: UsersRound }, attendance: { href: '/attendance', label: 'Learner attendance', icon: ClipboardCheck }, 'staff-attendance': { href: '/staff-attendance', label: 'Staff attendance', icon: UserCheck },
  fees: { href: '/fees', label: 'Fees & receipts', icon: CircleDollarSign }, academics: { href: '/academics', label: 'Results', icon: BookOpenCheck },
  homework: { href: '/homework', label: 'Homework', icon: GraduationCap }, 'homework-topics': { href: '/homework-topics', label: 'Homework topics', icon: ListChecks }, approvals: { href: '/approvals', label: 'Approvals', icon: BadgeCheck },
  reports: { href: '/reports', label: 'Reports', icon: FileBarChart }, transport: { href: '/transport', label: 'Transport', icon: BusFront },
  events: { href: '/events', label: 'Events & PTA', icon: CalendarDays },
  messages: { href: '/messages', label: 'Messages', icon: Mail }, helpdesk: { href: '/helpdesk', label: 'Help desk', icon: Headphones },
  audit: { href: '/audit', label: 'Audit log', icon: ScrollText },
  'id-cards': { href: '/id-cards', label: 'ID cards', icon: CreditCard },
  'demo-requests': { href: '/demo-requests', label: 'Demo requests', icon: Inbox },
  packages: { href: '/packages', label: 'Packages & add-ons', icon: Package }
} as const;

type ShellUser = { name: string; role: UserRole; photoUrl?: string | null; school: { name: string; logoUrl?: string | null } | null };
function roleLabel(role: UserRole) { return role.replaceAll('_',' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const configuredPages = navigationByRole[user.role];
  const pages = configuredPages.flatMap((key) =>
    key === 'users' ? [key, 'guardians' as const] : [key]
  );
  return <div className="min-h-screen lg:grid lg:grid-cols-[286px_1fr]">
    <aside className="wood-grain hidden min-h-screen flex-col p-5 text-white lg:flex">
      <Brand />
      <div className="chalk-board mt-7 rounded-2xl border border-white/10 p-4"><div className="flex items-center gap-3">{user.school ? <SchoolBadge name={user.school.name} logoUrl={user.school.logoUrl} size={40} className="rounded-xl"/> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-amber-200"><School size={21}/></div>}<div className="min-w-0"><p className="truncate text-sm font-black">{user.school?.name || 'AcademiaOS control'}</p><p className="truncate text-xs text-white/65">{roleLabel(user.role)}</p></div></div></div>
      <nav className="mt-6 space-y-1 overflow-y-auto pr-1" aria-label="Main navigation">
        {pages.map((key) => { const item = navItems[key as keyof typeof navItems]; if (!item) return null; const Icon = item.icon; return <Link key={key} href={item.href} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"><Icon size={18}/>{item.label}</Link>; })}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-amber-400 font-black text-slate-950">{user.photoUrl ? <Image src={user.photoUrl} alt={`${user.name} profile`} width={40} height={40} unoptimized className="h-10 w-10 object-cover"/> : <Image src="/icon.svg" alt="AcademiaOS default profile" width={40} height={40} className="h-10 w-10 object-contain p-1"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{user.name}</p><p className="truncate text-xs text-white/55">Secure session</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><Link href="/account/change-password" className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-2 py-2.5 text-xs font-bold hover:bg-white/15"><KeyRound size={15}/> Password</Link><form action={logoutAction}><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-2 py-2.5 text-xs font-bold hover:bg-white/15"><LogOut size={15}/> Sign out</button></form></div></div>
    </aside>
    <div className="min-w-0"><header className="wood-grain sticky top-0 z-20 border-b border-black/10 px-4 py-3 text-white lg:hidden"><div className="flex items-center justify-between gap-4"><Brand/><Link href="/account/change-password" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-amber-400 font-black text-slate-950">{user.photoUrl ? <Image src={user.photoUrl} alt={`${user.name} profile`} width={40} height={40} unoptimized className="h-10 w-10 object-cover"/> : <Image src="/icon.svg" alt="AcademiaOS default profile" width={40} height={40} className="h-10 w-10 object-contain p-1"/>}</Link></div><nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Mobile navigation">{pages.map((key) => { const item = navItems[key as keyof typeof navItems]; if (!item) return null; const Icon = item.icon; return <Link key={key} href={item.href} className="flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-extrabold"><Icon size={15}/>{item.label}</Link>; })}</nav></header>
    <main className="desk-line min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1500px]">{children}</div></main></div>
  </div>;
}
