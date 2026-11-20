"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthInput, AuthShell, FormAlert } from "../auth-components";
import { ApiError, apiRequest } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to request a password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Forgot Password?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Enter your email and we&apos;ll send reset instructions if an account exists.</p>
      {submitted ? (
        <div className="mt-6 space-y-4">
          <FormAlert tone="success">If the account exists, reset instructions have been sent.</FormAlert>
          <Link href="/login" className="block text-center text-sm font-semibold text-[#087b78] hover:underline">Return to Log In</Link>
          <p className="text-center text-sm text-slate-600">
            New patient?{" "}
            <Link href="/register" className="font-semibold text-[#087b78] hover:underline">Create an account</Link>
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthInput label="Email address" id="email" type="email" value={email} onChange={setEmail} autoComplete="email" disabled={isSubmitting} />
          {error ? <FormAlert>{error}</FormAlert> : null}
          <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-full bg-[#087b78] px-5 text-base font-bold text-white hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Sending instructions..." : "Send Reset Instructions"}
          </button>
          <Link href="/login" className="block text-center text-sm font-semibold text-[#087b78] hover:underline">Return to Log In</Link>
          <p className="text-center text-sm text-slate-600">
            New patient?{" "}
            <Link href="/register" className="font-semibold text-[#087b78] hover:underline">Create an account</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
