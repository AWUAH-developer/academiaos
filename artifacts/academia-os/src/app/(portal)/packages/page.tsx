import { asc } from 'drizzle-orm';
import { Package, PlusCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/db';
import { packageAddons, packages } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { createPackageAction, togglePackageAction } from '@/app/actions/subscriptions';

export const dynamic = 'force-dynamic';

function fmt(n: string | number) {
  return `GHS ${parseFloat(String(n)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export default async function PackagesPage() {
  const user = await requireUser();
  if (user.role !== 'SUPER_ADMIN') {
    return <div className="paper-card p-8 text-center text-slate-500">Access denied.</div>;
  }

  const [pkgs, addons] = await Promise.all([
    db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.name)),
    db.select().from(packageAddons).orderBy(asc(packageAddons.sortOrder), asc(packageAddons.name)),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Packages & add-ons"
        description="Define what each subscription tier includes. These packages appear in the school enrollment wizard."
      />

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        {/* ── Package list ── */}
        <div className="space-y-4">
          <h2 className="font-black text-slate-800">Subscription packages</h2>
          {pkgs.map(pkg => (
            <div key={pkg.id} className="paper-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-chalk-50 text-chalk-700">
                      <Package size={18}/>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{pkg.name}</h3>
                      {pkg.description && <p className="text-xs text-slate-500">{pkg.description}</p>}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      {pkg.pricePerLearner
                        ? <>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Price / learner</p>
                            <p className="mt-0.5 text-lg font-black text-chalk-700">GHS {parseFloat(String(pkg.pricePerLearner)).toFixed(2)}</p>
                          </>
                        : <>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Price / term</p>
                            <p className="mt-0.5 text-lg font-black text-chalk-700">{fmt(pkg.pricePerTerm)}</p>
                          </>
                      }
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Max learners</p>
                      <p className="mt-0.5 font-bold text-slate-800">{pkg.maxLearners ?? 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Max staff</p>
                      <p className="mt-0.5 font-bold text-slate-800">{pkg.maxStaff ?? 'Unlimited'}</p>
                    </div>
                  </div>
                  {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {(pkg.features as string[]).map(f => (
                        <li key={f} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`status-pill ${pkg.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {pkg.isActive ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                  <form action={togglePackageAction}>
                    <input type="hidden" name="id" value={pkg.id}/>
                    <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs gap-1.5">
                      {pkg.isActive ? <ToggleLeft size={14}/> : <ToggleRight size={14}/>}
                      {pkg.isActive ? 'Hide' : 'Show'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}

          {/* Create new package */}
          <details className="paper-card">
            <summary className="flex cursor-pointer items-center gap-2 p-5 font-black text-slate-700 hover:text-slate-900">
              <PlusCircle size={18} className="text-chalk-700"/> Add new package
            </summary>
            <form action={createPackageAction} className="border-t border-slate-100 p-5 space-y-3">
              <input className="input" name="name" placeholder="Package name *" required/>
              <input className="input" name="description" placeholder="Short description"/>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Price / term (GHS) *</label>
                  <input className="input" name="pricePerTerm" type="number" min="0" step="0.01" required/>
                </div>
                <div>
                  <label className="label">Max learners</label>
                  <input className="input" name="maxLearners" type="number" min="1" placeholder="Unlimited"/>
                </div>
                <div>
                  <label className="label">Max staff</label>
                  <input className="input" name="maxStaff" type="number" min="1" placeholder="Unlimited"/>
                </div>
              </div>
              <div>
                <label className="label">Features — one per line</label>
                <textarea className="input resize-none" name="features" rows={5} placeholder={"Admissions & learner records\nDaily attendance\nFee collection\nBasic reports"}/>
              </div>
              <button className="btn-primary w-full"><PlusCircle size={16}/> Create package</button>
            </form>
          </details>
        </div>

        {/* ── Add-ons list ── */}
        <div>
          <h2 className="mb-4 font-black text-slate-800">Add-ons</h2>
          <div className="paper-card divide-y divide-slate-100">
            {addons.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-black text-slate-900">{a.name}</p>
                  {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                </div>
                <p className="shrink-0 text-sm font-black text-chalk-700">{fmt(a.pricePerTerm)}</p>
              </div>
            ))}
            {addons.length === 0 && <p className="p-5 text-sm text-slate-400">No add-ons yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
