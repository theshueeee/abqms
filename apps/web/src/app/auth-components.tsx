import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f8] px-5 py-10 sm:px-8">
      <section className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-[#dfe8e4] bg-white shadow-[0_12px_35px_rgba(24,33,31,0.06)]">
        <header className="flex flex-col items-center border-b border-[#e4ebe8] bg-[#fbfcfb] px-6 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#087b78] text-[#cfff72]" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="h-9 w-9 fill-none stroke-current" strokeWidth="1.8">
              <path d="M10.2 7.4c-2.7-1.6-5.8.2-5.1 3.5l2.4 11.4c.5 2.4 3.1 2.8 4 .5l2.5-6.5 2.5 6.5c.9 2.3 3.5 1.9 4-.5l2.4-11.4c.7-3.3-2.4-5.1-5.1-3.5-2.1 1.3-3.4 1.3-5.6 0Z" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#087b78]">UM Dentistry</h1>
          <p className="mt-1 text-sm text-slate-600">Fakulti Pergigian Patient Portal</p>
        </header>
        <div className="px-6 py-7 sm:px-8">{children}</div>
      </section>
    </main>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </p>
  );
}

export function AuthInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-[#cbd8d4] bg-white px-4 text-base text-slate-900 outline-none transition focus:border-[#087b78] focus:ring-2 focus:ring-[#087b78]/20 disabled:bg-slate-50"
      />
    </div>
  );
}
