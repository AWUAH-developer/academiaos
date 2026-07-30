import Link from 'next/link';
import {
  BarChart3,
  BookOpenCheck,
  BusFront,
  CalendarCheck2,
  CircleDollarSign,
  FileText,
  Laptop,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { AnimatedNav } from '@/components/marketing/HeroEntrance';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { PublicFooter } from '@/components/marketing/PublicFooter';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Features | AcademiaOS',
  description:
    'Explore connected school administration, academic, finance, safety, mobile and offline desktop features in AcademiaOS.',
};

const features = [
  {
    title: 'Attendance and automatic daily fees',
    eyebrow: 'Attendance · Daily fees',
    description:
      'Record attendance once and let AcademiaOS connect the official register to the learner’s daily-fee plan, balance and reports.',
    points: ['Present, absent, late and partial attendance', 'Automatic charges for confirmed attendance', 'Absent days and holidays are skipped', 'Corrections follow an authorised review process'],
    icon: CalendarCheck2,
    accent: 'bg-emerald-100 text-emerald-700',
    sample: ['286 present today', '14 absent', 'GHS 3,575 daily fees'],
  },
  {
    title: 'Smart ID cards, QR scanning and gate verification',
    eyebrow: 'Identity · Smart ID add-on',
    description:
      'Create clear staff and learner identification and verify each person through a unique QR code at the gate, on transport or during attendance.',
    points: ['Staff and learner card designs', 'Individual or bulk printing', 'Unique QR identity verification', 'Gate and transport scanning support'],
    icon: QrCode,
    accent: 'bg-rose-100 text-rose-700',
    sample: ['Staff card verified', 'Learner gate entry recorded', 'QR identity confirmed'],
  },
  {
    title: 'Academic results and proprietor approval',
    eyebrow: 'Academics · Controlled publishing',
    description:
      'Move results through a clear chain from teacher submission to academic review and final proprietor approval before families see them.',
    points: ['Class tests, exams and grading', 'Teacher submission controls', 'Headteacher and academic review', 'Proprietor approval and result locking'],
    icon: BookOpenCheck,
    accent: 'bg-violet-100 text-violet-700',
    sample: ['Teacher submitted', 'Academic review complete', 'Proprietor approval pending'],
  },
  {
    title: 'Homework and learning materials',
    eyebrow: 'Teaching · Learning',
    description:
      'Publish homework, organise learning topics and attach approved materials so learners and guardians know what is expected.',
    points: ['Homework by class and subject', 'Due dates and instructions', 'Downloadable learning materials', 'Family visibility through connected access'],
    icon: FileText,
    accent: 'bg-blue-100 text-blue-700',
    sample: ['Science assignment', 'English worksheet', 'Mathematics practice'],
  },
  {
    title: 'Parent-school communication',
    eyebrow: 'Families · Communication',
    description:
      'Give parents one trusted place to see attendance, fees, homework, announcements and approved academic results.',
    points: ['Parent and guardian portal', 'Internal messages and announcements', 'School event visibility', 'No need to chase separate spreadsheets'],
    icon: MessageSquareText,
    accent: 'bg-cyan-100 text-cyan-700',
    sample: ['Attendance notification', 'Homework published', 'Fee balance updated'],
  },
  {
    title: 'Fees, receipts, arrears and finance',
    eyebrow: 'Finance · Accountability',
    description:
      'Track charges, payments, receipts, approved adjustments and follow-up activity against one live learner balance.',
    points: ['Term, monthly and daily plans', 'Numbered official receipts', 'Outstanding balances and arrears', 'Payment and adjustment audit trail'],
    icon: CircleDollarSign,
    accent: 'bg-amber-100 text-amber-700',
    sample: ['GHS 48,250 collected', 'GHS 7,420 outstanding', '24 receipts issued'],
  },
  {
    title: 'Staff attendance and role permissions',
    eyebrow: 'Staff · Access control',
    description:
      'Protect school records with role-based access and ensure staff attendance is recorded by an authorised officer rather than by the staff member.',
    points: ['Fourteen operational role types', 'Authorised staff attendance officer', 'Staff cannot mark their own arrival', 'School-level account and access controls'],
    icon: UserCheck,
    accent: 'bg-teal-100 text-teal-700',
    sample: ['Headteacher access', 'Accounts access', 'Security attendance officer'],
  },
  {
    title: 'Transport management',
    eyebrow: 'Transport · Operations',
    description:
      'Organise transport records, operational access and learner movement from the same secure school platform.',
    points: ['Transport officer access', 'Learner transport records', 'Gate and security visibility', 'Mobile and desktop-ready workflows'],
    icon: BusFront,
    accent: 'bg-indigo-100 text-indigo-700',
    sample: ['Route A on time', 'Route B seven minutes away', 'Route C boarding'],
  },
  {
    title: 'Student safety, visitors and authorised pickup',
    eyebrow: 'Safety · Security add-on',
    description:
      'Support safer handover and entry procedures by recording approved guardians, visitors, gate activity and security incidents.',
    points: ['Authorised pickup verification', 'Visitor arrival and departure records', 'Gate access checks', 'Security incident documentation'],
    icon: ShieldCheck,
    accent: 'bg-red-100 text-red-700',
    sample: ['Guardian verified', 'Visitor pass active', 'Pickup authorised'],
  },
  {
    title: 'AI-assisted reports and academic insights',
    eyebrow: 'Intelligence · Decision support',
    description:
      'Turn approved school data into clear summaries that help leaders identify attendance, finance and academic patterns more quickly.',
    points: ['Attendance and performance patterns', 'Academic summaries from approved records', 'Management-ready insight cards', 'Human review remains in control'],
    icon: Sparkles,
    accent: 'bg-purple-100 text-purple-700',
    sample: ['Attendance improved 8%', 'Homework linked to higher scores', 'Finance trend highlighted'],
  },
  {
    title: 'Mobile access',
    eyebrow: 'Android · iOS',
    description:
      'Give authorised staff and families the information they need while away from a desktop, using the same account and permissions.',
    points: ['Staff attendance and approvals', 'Parent fees, homework and results', 'Announcements and notifications', 'Secure device and session controls'],
    icon: Smartphone,
    accent: 'bg-fuchsia-100 text-fuchsia-700',
    sample: ['Staff mobile app', 'Parent mobile app', 'Secure notifications'],
  },
  {
    title: 'Offline desktop and synchronisation',
    eyebrow: 'Desktop · Resilience',
    description:
      'Keep essential school work moving when internet service is interrupted and synchronise approved changes when the connection returns.',
    points: ['Desktop application for school offices', 'Offline attendance and operational records', 'Controlled incremental synchronisation', 'Protection against duplicate updates'],
    icon: Laptop,
    accent: 'bg-orange-100 text-orange-700',
    sample: ['Offline records ready', '12 changes queued', 'Sync completed securely'],
  },
  {
    title: 'Reports, exports, audit logs and security',
    eyebrow: 'Control · Evidence',
    description:
      'Generate useful reports, export records and preserve a clear history of important actions across the school platform.',
    points: ['Operational and academic reports', 'Printable and exportable records', 'Audit history for sensitive actions', 'Role, session and tenant security'],
    icon: BarChart3,
    accent: 'bg-slate-200 text-slate-700',
    sample: ['24 reports ready', '1,842 audit events', 'All sessions protected'],
  },
];

function ProductVisual({
  title,
  icon: Icon,
  accent,
  sample,
}: {
  title: string;
  icon: typeof UsersRound;
  accent: string;
  sample: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,.14)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">AcademiaOS live view</p>
        <span className="h-6 w-6 rounded-lg bg-[#1f5b45]/10" />
      </div>
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className={`grid h-14 w-14 place-items-center rounded-2xl ${accent}`}>
            <Icon size={27} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Connected module</p>
            <p className="mt-1 text-xl font-black text-slate-900">{title}</p>
          </div>
        </div>
        <div className="mt-7 grid gap-3">
          {sample.map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <span className="text-sm font-bold text-slate-700">{item}</span>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function FeaturesPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-[#fffdf7] font-sans antialiased">
      <AnimatedNav user={user} />

      <section className="wood-grain relative overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-[45px] border-white/5" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Connected school operations</p>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Every important part of your school, working together.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            AcademiaOS connects administration, academics, finance, safety, families, mobile access and offline desktop work without separating the school into disconnected systems.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="btn-primary px-7 py-3">Compare packages</Link>
            <Link href="/pricing?type=demo#request" className="rounded-xl border border-white/20 bg-white/10 px-7 py-3 text-sm font-black text-white transition hover:bg-white/20">
              Request a demo
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
          {['13 feature areas', '14 role types', 'Web + mobile + desktop', 'One secure platform'].map((item) => (
            <p key={item} className="text-sm font-black text-slate-700">{item}</p>
          ))}
        </div>
      </section>

      <main>
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const reverse = index % 2 === 1;
          return (
            <section key={feature.title} className={`px-5 py-20 sm:px-8 ${index % 2 ? 'bg-slate-50' : 'bg-[#fffdf7]'}`}>
              <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
                <ScrollReveal direction={reverse ? 'right' : 'left'} className={reverse ? 'lg:order-2' : ''}>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.accent}`}>
                    <Icon size={24} />
                  </div>
                  <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#1f5b45]">{feature.eyebrow}</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">{feature.title}</h2>
                  <p className="mt-5 text-lg leading-8 text-slate-600">{feature.description}</p>
                  <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                    {feature.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm font-bold leading-6 text-slate-600">
                        <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </ScrollReveal>

                <ScrollReveal direction={reverse ? 'left' : 'right'} className={reverse ? 'lg:order-1' : ''}>
                  <ProductVisual title={feature.title} icon={Icon} accent={feature.accent} sample={feature.sample} />
                </ScrollReveal>
              </div>
            </section>
          );
        })}
      </main>

      <section className="wood-grain px-5 py-20 text-center text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-black tracking-tight">Choose the AcademiaOS package that fits your school.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">
            Compare Starter, Standard and Premium without guessing at a price. Tell us your school size and requirements, and the team will prepare the appropriate package information.
          </p>
          <Link href="/pricing" className="btn-primary mt-8 px-8 py-3">View package comparison</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
