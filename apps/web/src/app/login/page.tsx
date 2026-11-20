"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";

function ToothMark() {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#087b78] text-[#cfff72]" aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-9 w-9 fill-none stroke-current" strokeWidth="1.8">
        <path d="M10.2 7.4c-2.7-1.6-5.8.2-5.1 3.5l2.4 11.4c.5 2.4 3.1 2.8 4 .5l2.5-6.5 2.5 6.5c.9 2.3 3.5 1.9 4-.5l2.4-11.4c.7-3.3-2.4-5.1-5.1-3.5-2.1 1.3-3.4 1.3-5.6 0Z" />
      </svg>
    </span>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {hidden ? (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.8 9.5 7-.4.9-1.2 2.2-2.5 3.4M6.2 6.3C3.9 7.8 2.7 10 2.5 12c.5 1.2 2.2 4.1 6 5.6" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = await apiRequest<{ user?: { role?: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      window.location.assign(body.user?.role === "patient" ? "/patient/dashboard" : "/staff");
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 429 ? "Too many attempts. Try again later." : requestError instanceof ApiError ? requestError.message : "Unable to log in. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f8] px-5 py-10 sm:px-8">
      <section className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-[#dfe8e4] bg-white shadow-[0_12px_35px_rgba(24,33,31,0.06)]">
        <header className="flex flex-col items-center border-b border-[#e4ebe8] bg-[#fbfcfb] px-6 py-8 text-center">
          <ToothMark />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#087b78]">UM Dentistry</h1>
          <p className="mt-1 text-sm text-slate-600">Fakulti Pergigian Patient Portal</p>
        </header>

        <div className="px-6 py-7 sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
          {registered ? <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Account created. You can log in now.</p> : null}
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-[#cbd8d4] bg-white px-4 text-base text-slate-900 outline-none transition focus:border-[#087b78] focus:ring-2 focus:ring-[#087b78]/20"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-[#cbd8d4] bg-white px-4 pr-12 text-base text-slate-900 outline-none transition focus:border-[#087b78] focus:ring-2 focus:ring-[#087b78]/20"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-[#087b78]"
                  disabled={isSubmitting}
                >
                  <EyeIcon hidden={!showPassword} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#087b78]"
                  disabled={isSubmitting}
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-semibold text-[#087b78] hover:underline">
                Forgot password?
              </Link>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-full bg-[#087b78] px-5 text-base font-bold text-white transition hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>New Patient?</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/register"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#087b78] px-5 text-base font-bold text-[#087b78] transition hover:bg-[#eaf4e5]"
          >
            Create Account <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
