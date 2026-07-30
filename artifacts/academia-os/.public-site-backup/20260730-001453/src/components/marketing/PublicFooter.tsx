import Image from 'next/image';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#2f1d14] px-5 py-10 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white p-1">
              <Image src="/icon.svg" alt="AcademiaOS" width={40} height={40} className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-lg font-black text-white">
                Academia<span className="text-[#f4c542]">OS.</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[.2em] text-amber-200/70">
                School command centre
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/55">
            One secure platform for school administration, academics, finance, families, mobile access and offline desktop work.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Explore</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-white/65">
            <Link href="/features" className="hover:text-white">Features</Link>
            <Link href="/pricing" className="hover:text-white">Packages</Link>
            <Link href="/pricing?type=demo#request" className="hover:text-white">Request a demo</Link>
            <Link href="/login" className="hover:text-white">School sign in</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Contact</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-white/65">
            <a href="mailto:hello@academiaos.cc" className="hover:text-white">hello@academiaos.cc</a>
            <span>Built for Ghanaian schools</span>
            <span>GHS and multi-currency ready</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} AcademiaOS. All rights reserved.</span>
        <span>Primary and secondary school management platform.</span>
      </div>
    </footer>
  );
}
