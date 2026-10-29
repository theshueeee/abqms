export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="border-b border-brand/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <a href="/" className="flex items-center gap-3" aria-label="DentaQueue home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-black text-brand-lime">
              DQ
            </span>
            <span className="text-lg font-bold tracking-tight text-brand">DentaQueue</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-brand" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-brand" href="#clinic-info">Clinic information</a>
          </nav>
          <a
            href="#sign-in"
            className="rounded-full border border-brand/20 px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand-pale"
          >
            Sign in
          </a>
        </div>
      </header>

      <section className="relative bg-brand px-5 pb-20 pt-14 text-white sm:px-8 sm:pt-20 lg:px-12 lg:pb-28">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-lime/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-lime">
              <span className="h-2 w-2 rounded-full bg-brand-lime" />
              General Dental Clinic · UM
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Dental care,
              <br />
              <span className="text-brand-lime">organised.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Book your appointment, join the walk-in queue, and know what is happening before you
              arrive at the clinic.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#how-it-works"
                className="rounded-full bg-brand-lime px-6 py-3.5 text-center text-sm font-extrabold text-brand transition-transform hover:-translate-y-0.5"
              >
                Book an appointment
              </a>
              <a
                href="#clinic-info"
                className="rounded-full border border-white/30 px-6 py-3.5 text-center text-sm font-extrabold text-white transition-colors hover:bg-white/10"
              >
                Join the walk-in queue
              </a>
            </div>
          </div>

          <div className="rounded-4xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
            <div className="rounded-3xl bg-white p-6 text-brand shadow-card sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Today at the clinic</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Queue is moving</h2>
                </div>
                <span className="rounded-full bg-brand-pale px-3 py-1.5 text-xs font-bold text-brand">Live</span>
              </div>
              <div className="mt-8 flex items-end justify-between border-b border-slate-100 pb-6">
                <div>
                  <p className="text-5xl font-black tracking-tight">12</p>
                  <p className="mt-1 text-sm text-slate-500">patients waiting</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-brand">~35 min</p>
                  <p className="mt-1 text-sm text-slate-500">estimated wait</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-lime text-xs font-black text-brand">✓</span>
                <span>Check the queue before you leave home.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">One place for your visit</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-brand sm:text-4xl">
            Less waiting. More clarity.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["01", "Choose your visit", "Find an appointment time or choose a walk-in visit that fits your day."],
            ["02", "Keep your place", "Get a clear ticket and follow your position without standing in line."],
            ["03", "Arrive prepared", "See clinic updates and know when it is nearly your turn."],
          ].map(([number, title, description]) => (
            <article key={number} className="rounded-3xl bg-white p-6 shadow-card">
              <span className="text-sm font-black text-brand-lime [text-shadow:1px_1px_0_#173d35]">{number}</span>
              <h3 className="mt-8 text-xl font-black text-brand">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="clinic-info" className="border-t border-brand/10 bg-brand-pale/60 px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-brand">Clinic hours</p>
            <p className="mt-1 text-sm text-slate-600">Monday to Friday · 8:00 AM – 5:00 PM</p>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Need help with your visit? Our dental assistants are here to help you at the clinic.
          </p>
        </div>
      </section>
    </main>
  );
}
