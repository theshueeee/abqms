"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AuthInput, AuthShell, FormAlert } from "../auth-components";
import { ApiError, apiRequest } from "@/lib/api";

const minimumPasswordLength = 12;

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (password.length < minimumPasswordLength) {
      setError(`Password must be at least ${minimumPasswordLength} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest<null>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setCompleted(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Set New Password</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Choose a new password with at least {minimumPasswordLength} characters.</p>
      {completed ? (
        <div className="mt-6 space-y-4">
          <FormAlert tone="success">Your password was reset successfully.</FormAlert>
          <Link href="/login" className="flex h-12 items-center justify-center rounded-full bg-[#087b78] px-5 text-base font-bold text-white hover:bg-[#066764]">Continue to Log In</Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthInput label="New password" id="password" type="password" value={password} onChange={setPassword} autoComplete="new-password" disabled={isSubmitting} />
          <AuthInput label="Confirm new password" id="confirmPassword" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" disabled={isSubmitting} />
          {error ? <FormAlert>{error}</FormAlert> : null}
          <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-full bg-[#087b78] px-5 text-base font-bold text-white hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Resetting password..." : "Reset Password"}
          </button>
          <Link href="/login" className="block text-center text-sm font-semibold text-[#087b78] hover:underline">Return to Log In</Link>
          <p className="text-center text-sm text-slate-600">
            Need a new reset email?{" "}
            <Link href="/forgot-password" className="font-semibold text-[#087b78] hover:underline">Request another link</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
