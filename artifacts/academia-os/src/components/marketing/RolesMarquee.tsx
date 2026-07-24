'use client';

const roles = [
  'School admin','Headteacher','Class teacher','Accounts officer',
  'Receptionist','Transport officer','Security / gate','Parent / guardian',
  'Proprietor','Academic admin','Librarian','Canteen staff','Learner',
];

export function RolesMarquee() {
  // Duplicate for seamless loop
  const doubled = [...roles, ...roles];

  return (
    <div className="overflow-hidden">
      <div className="marquee-track flex gap-3 w-max">
        {doubled.map((r, i) => (
          <span
            key={i}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm"
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
