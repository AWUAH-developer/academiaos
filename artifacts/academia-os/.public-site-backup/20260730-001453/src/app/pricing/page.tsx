import Link from 'next/link';
import { Check, Minus, Star } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { AnimatedNav } from '@/components/marketing/HeroEntrance';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PricingRequestForm } from '@/components/marketing/PricingRequestForm';
import {
  comparisonGroups,
  getPublicPlan,
  normalisePublicPlan,
  publicPlans,
  type FeatureAvailability,
  type PublicPlanKey,
} from '@/lib/public-plans';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Packages | AcademiaOS',
  description:
    'Compare Starter, Standard and Premium AcademiaOS packages and request pricing or a school demonstration.',
};

function Availability({ value }: { value: FeatureAvailability }) {
  if (value === 'yes') {
    return (
      <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <Check size={16} strokeWidth={3} />
      </span>
    );
  }

  if (value === 'addon') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
        Add-on
      </span>
    );
  }

  if (value === 'limited') {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-800">
        Limited
      </span>
    );
  }

  return (
    <span className="mx-auto grid h-7 w-7 place-items-center text-slate-300">
      <Minus size={18} />
    </span>
  );
}

function ComparisonGroupRows({
  group,
}: {
  group: (typeof comparisonGroups)[number];
}) {
  return (
    <>
      <tr className="bg-slate-100">
        <th colSpan={4} className="px-5 py-3 text-xs font-black uppercase tracking-[.16em] text-slate-600">
          {group.name}
        </th>
      </tr>
      {group.features.map((feature) => (
        <tr key={feature.name} className="border-t border-slate-100">
          <td className="px-5 py-4">
            <p className="text-sm font-bold text-slate-700">{feature.name}</p>
            {feature.note && <p className="mt-1 text-[10px] font-bold text-amber-700">{feature.note}</p>}
          </td>
          {(['starter', 'standard', 'premium'] as PublicPlanKey[]).map((key) => (
            <td key={key} className={`px-4 py-4 text-center ${key === 'standard' ? 'bg-amber-50/35' : ''}`}>
              <Availability value={feature[key]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; type?: string }>;
}) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const selectedPackage = normalisePublicPlan(params.package);
  const selectedPlan = getPublicPlan(selectedPackage);
  const initialType = String(params.type || '').toLowerCase() === 'demo'
    ? 'DEMO' as const
    : 'PRICING' as const;

  return (
    <div className="min-h-screen bg-[#fffdf7] font-sans antialiased">
      <AnimatedNav user={user} />

      <section className="wood-grain px-5 py-20 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Packages for every stage</p>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Choose capability first. Discuss the right price for your school next.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            No invented figures and no surprise checkout. Compare exactly what Starter, Standard and Premium include, then send your school details for pricing or a demonstration.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {publicPlans.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-[28px] border bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,.08)] ${
                plan.popular
                  ? 'border-[#d9a441] ring-4 ring-[#d9a441]/15 lg:-translate-y-3'
                  : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#d9a441] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#2f1d14]">
                  <Star size={13} fill="currentColor" /> Most Popular
                </span>
              )}

              <p className="text-xs font-black uppercase tracking-[.18em] text-[#1f5b45]">{plan.idealFor}</p>
              <h2 className="mt-4 text-3xl font-black text-slate-900">{plan.name}</h2>
              <p className="mt-2 text-lg font-black text-[#1f5b45]">{plan.tagline}</p>
              <p className="mt-4 min-h-[84px] text-sm leading-7 text-slate-500">{plan.description}</p>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Pricing</p>
                <p className="mt-1 text-xl font-black text-slate-900">Request school pricing</p>
                <p className="mt-1 text-xs text-slate-500">
                  Based on school size, requirements and selected add-ons.
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-sm font-bold leading-6 text-slate-600">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>

              <div className="mt-7 grid gap-3">
                <Link
                  href={`/pricing?package=${plan.key}&type=pricing#request`}
                  className="btn-primary justify-center py-3"
                >
                  Request pricing
                </Link>
                <Link
                  href={`/pricing?package=${plan.key}&type=demo#request`}
                  className="btn-secondary justify-center py-3"
                >
                  Request demo
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-3 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#1f5b45]">Full comparison</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              See exactly what every package includes.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              Smart ID and Security remain optional add-ons, so a school can choose the physical identity and gate tools it actually needs.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
            <table className="w-full min-w-[820px] border-collapse bg-white text-left">
              <thead className="sticky top-[73px] z-30 bg-[#2f1d14] text-white shadow-lg">
                <tr>
                  <th className="w-[42%] px-5 py-5 text-sm font-black">Feature</th>
                  {publicPlans.map((plan) => (
                    <th
                      key={plan.key}
                      className={`w-[19.33%] px-4 py-5 text-center ${plan.popular ? 'bg-[#3d2a1f]' : ''}`}
                    >
                      <span className="block text-lg font-black">{plan.name}</span>
                      {plan.popular && (
                        <span className="mt-1 inline-block text-[9px] font-black uppercase tracking-widest text-amber-300">
                          Most Popular
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {comparisonGroups.map((group) => (
                  <ComparisonGroupRows key={group.name} group={group} />
                ))}

                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-6 text-sm font-black text-slate-900">Choose your package</td>
                  {publicPlans.map((plan) => (
                    <td key={plan.key} className="px-4 py-6 text-center">
                      <Link
                        href={`/pricing?package=${plan.key}&type=pricing#request`}
                        className="inline-flex rounded-xl bg-[#1f5b45] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#194c3a]"
                      >
                        Request pricing
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="request" className="scroll-mt-24 wood-grain px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Selected package</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">{selectedPlan.name}</h2>
            <p className="mt-3 text-xl font-black text-amber-300">{selectedPlan.tagline}</p>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Complete the form and the AcademiaOS team will contact your school. Your selection will be included automatically in the request reviewed by Super Admin.
            </p>

            <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm font-black text-white">What happens next</p>
              <ol className="mt-5 space-y-4 text-sm leading-6 text-white/70">
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 text-xs font-black text-[#2f1d14]">1</span>
                  Your request is saved securely in AcademiaOS.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 text-xs font-black text-[#2f1d14]">2</span>
                  Super Admin reviews the school size, package and add-ons.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 text-xs font-black text-[#2f1d14]">3</span>
                  The team contacts your school with pricing or demo arrangements.
                </li>
              </ol>
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-6 shadow-2xl sm:p-8">
            <h3 className="text-2xl font-black text-slate-900">
              {initialType === 'DEMO' ? 'Request a school demo' : 'Request package pricing'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The form does not display or collect payment. It records your requirements for a direct response.
            </p>
            <div className="mt-7">
              <PricingRequestForm initialPackage={selectedPackage} initialType={initialType} />
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
