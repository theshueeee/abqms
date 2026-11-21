"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";

const navItems = [
  { label: "Home", href: "/patient/dashboard", icon: "home" },
  { label: "Book", href: "/patient/book", icon: "calendar" },
  { label: "Queue", href: "/patient/dashboard#queue", icon: "users" },
  { label: "Records", href: "/patient/dashboard#records", icon: "document" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9.5 19v-5h5v5" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 17h3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4.9V20" /></>,
    document: <><path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function PatientShell({
  children,
  active,
}: {
  children: ReactNode;
  active: "home" | "book";
}) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ appointments: unknown[] }>("/appointments", { method: "GET" })
      .then(() => {
        if (!cancelled) setAuthReady(true);
      })
      .catch((error) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          window.location.assign("/login");
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6]">
        <p role="status" className="text-sm font-semibold text-slate-600">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white px-6 py-8 lg:block">
        <Link href="/patient/dashboard" className="text-xl font-black tracking-tight text-[#087b78]">
          UM Dentistry
        </Link>
        <nav className="mt-12 space-y-2" aria-label="Patient navigation">
          {navItems.map((item) => {
            const isActive = item.label.toLowerCase() === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-12 items-center gap-3 rounded-lg px-4 text-base font-bold ${
                  isActive ? "bg-[#087b78] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 lg:hidden" aria-label="Mobile patient navigation">
          <Link href="/patient/dashboard" className="font-black text-[#087b78]">UM Dentistry</Link>
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                aria-current={item.label.toLowerCase() === active ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  item.label.toLowerCase() === active ? "bg-[#087b78] text-white" : "text-slate-600"
                }`}
              >
                <NavIcon name={item.icon} />
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </section>
    </main>
  );
}
