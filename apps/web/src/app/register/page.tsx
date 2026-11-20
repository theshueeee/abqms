"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthInput, AuthShell, FormAlert } from "../auth-components";
import { ApiError, apiRequest } from "@/lib/api";

const minimumPasswordLength = 12;

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", dateOfBirth: "", password: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.dateOfBirth) {
      setError("Complete all required fields.");
      return;
    }
    if (form.password.length < minimumPasswordLength) {
      setError(`Password must be at least ${minimumPasswordLength} characters.`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest<{ user: { role: string } }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          phone_number: form.phone.trim(),
          date_of_birth: form.dateOfBirth,
          password: form.password,
        }),
      });
      setCompleted(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create Account</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Set up your patient account to manage appointments and queue visits.</p>
      {completed ? (
        <div className="mt-6 space-y-4">
          <FormAlert tone="success">Your account was created successfully.</FormAlert>
          <Link href="/login" className="flex h-12 items-center justify-center rounded-full bg-[#087b78] px-5 text-base font-bold text-white hover:bg-[#066764]">
            Continue to Log In
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthInput label="Full name" id="fullName" value={form.fullName} onChange={(value) => update("fullName", value)} autoComplete="name" disabled={isSubmitting} />
          <AuthInput label="Email address" id="email" type="email" value={form.email} onChange={(value) => update("email", value)} autoComplete="email" disabled={isSubmitting} />
          <AuthInput label="Phone number" id="phone" type="tel" value={form.phone} onChange={(value) => update("phone", value)} autoComplete="tel" disabled={isSubmitting} />
          <AuthInput label="Date of birth" id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(value) => update("dateOfBirth", value)} disabled={isSubmitting} />
          <AuthInput label="Password" id="password" type="password" value={form.password} onChange={(value) => update("password", value)} autoComplete="new-password" disabled={isSubmitting} />
          <AuthInput label="Confirm password" id="confirmPassword" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} autoComplete="new-password" disabled={isSubmitting} />
          {error ? <FormAlert>{error}</FormAlert> : null}
          <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-full bg-[#087b78] px-5 text-base font-bold text-white hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[#087b78] hover:underline">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
