"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";

type UserRole = "patient" | "dental_assistant" | "admin";

type Flag = {
  suspension_id: string;
  flagging_reason: string;
  triggered_by: "system" | "staff";
  flagged_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
};

type PatientSummary = {
  patient_id: string;
  full_name: string;
  email: string;
  account_status: "active" | "flagged" | "suspended";
  suspension_reason: string | null;
};

type FlaggedRow = { patient: PatientSummary; flag: Flag | null };
type SuspendedRow = { patient: PatientSummary; record: Flag | null };

function formatClinicDate(value: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 4 6v6c0 4.4 3.4 7.6 8 9 4.6-1.4 8-4.6 8-9V6l-8-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 21V4m0 0c2-1.5 4-1.5 6 0s4 1.5 6 0v9c-2 1.5-4 1.5-6 0s-4-1.5-6 0" />
    </svg>
  );
}

type ActionState = { busy: boolean; error: string; message: string };

function useAction(formId: string) {
  const [state, setState] = useState<ActionState>({ busy: false, error: "", message: "" });
  const start = useCallback(() => setState({ busy: true, error: "", message: "" }), []);
  const fail = useCallback((error: string) => setState({ busy: false, error, message: "" }), []);
  const succeed = useCallback((message: string) => setState({ busy: false, error: "", message }), []);
  const reset = useCallback(() => setState({ busy: false, error: "", message: "" }), []);
  void formId;
  return { state, start, fail, succeed, reset };
}

function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.message}
      </p>
    );
  }
  return null;
}

function FlaggedCard({
  row,
  canAct,
  onChanged,
}: {
  row: FlaggedRow;
  canAct: boolean;
  onChanged: () => void;
}) {
  const { state, start, fail } = useAction("suspend");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    if (!reason.trim()) {
      fail("Enter a reason to suspend this account.");
      return;
    }
    start();
    try {
      await apiRequest(`/accounts/${row.patient.patient_id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason.trim(), admin_notes: notes.trim() || undefined }),
      });
      setReason("");
      setNotes("");
      onChanged();
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Unable to suspend the account.");
    }
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,33,31,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <FlagIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-slate-900">{row.patient.full_name}</h3>
          <p className="text-sm text-slate-600">{row.patient.email}</p>
          <p className="mt-2 text-sm text-slate-700">
            {row.flag?.flagging_reason ?? row.patient.suspension_reason ?? "Flagged for review"}
          </p>
          {row.flag?.flagged_at ? (
            <time dateTime={row.flag.flagged_at} className="mt-1 block text-xs text-slate-500">
              Flagged {formatClinicDate(row.flag.flagged_at)}
            </time>
          ) : null}
          {canAct ? (
            <div className="mt-4">
              <label htmlFor={`reason-${row.patient.patient_id}`} className="mb-1 block text-sm font-semibold text-slate-800">
                Suspension reason
              </label>
              <input
                id={`reason-${row.patient.patient_id}`}
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Repeat booking abuse"
                disabled={state.busy}
                className="h-10 w-full rounded-xl border border-[#cbd8d4] bg-white px-3 text-base outline-none transition focus:border-[#087b78] focus:ring-2 focus:ring-[#087b78]/20"
              />
              <label htmlFor={`notes-${row.patient.patient_id}`} className="mb-1 mt-3 block text-sm font-semibold text-slate-800">
                Admin notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id={`notes-${row.patient.patient_id}`}
                name="admin_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                disabled={state.busy}
                className="w-full rounded-xl border border-[#cbd8d4] bg-white px-3 py-2 text-base outline-none transition focus:border-[#087b78] focus:ring-2 focus:ring-[#087b78]/20"
              />
              <button
                type="button"
                onClick={submit}
                disabled={state.busy}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-bold text-white transition hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.busy ? "Suspending..." : "Suspend account"}
              </button>
              <ActionMessage state={state} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function SuspendedCard({
  row,
  canAct,
  onChanged,
}: {
  row: SuspendedRow;
  canAct: boolean;
  onChanged: () => void;
}) {
  const { state, start, fail } = useAction("reinstate");

  async function submit() {
    start();
    try {
      await apiRequest(`/accounts/${row.patient.patient_id}/reinstate`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      onChanged();
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Unable to reinstate the account.");
    }
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,33,31,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
          <ShieldIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-slate-900">{row.patient.full_name}</h3>
          <p className="text-sm text-slate-600">{row.patient.email}</p>
          <p className="mt-2 text-sm text-slate-700">
            {row.patient.suspension_reason ?? row.record?.flagging_reason ?? "Suspended"}
          </p>
          {row.record?.reviewed_at ? (
            <time dateTime={row.record.reviewed_at} className="mt-1 block text-xs text-slate-500">
              Suspended {formatClinicDate(row.record.reviewed_at)}
            </time>
          ) : null}
          {canAct ? (
            <button
              type="button"
              onClick={submit}
              disabled={state.busy}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-[#087b78] px-5 text-sm font-bold text-[#087b78] transition hover:bg-[#eaf4e5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.busy ? "Reinstating..." : "Reinstate account"}
            </button>
          ) : null}
          <ActionMessage state={state} />
        </div>
      </div>
    </li>
  );
}

function StaffHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/staff/compliance" className="text-xl font-black tracking-tight text-[#087b78]">
          UM Dentistry
        </Link>
        <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#087b78]">
          Sign out
        </Link>
      </div>
    </header>
  );
}

export default function CompliancePage() {
  const [role, setRole] = useState<UserRole | "guest" | "pending">("pending");
  const [flagged, setFlagged] = useState<FlaggedRow[]>([]);
  const [suspended, setSuspended] = useState<SuspendedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [flagBody, suspendBody] = await Promise.all([
        apiRequest<{ flagged: FlaggedRow[] }>("/accounts/flagged", { method: "GET" }),
        apiRequest<{ suspended: SuspendedRow[] }>("/accounts/suspended", { method: "GET" }),
      ]);
      setFlagged(flagBody.flagged);
      setSuspended(suspendBody.suspended);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to load the compliance queue.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: { role?: string } }>("/auth/me", { method: "GET" })
      .then((body) => {
        if (cancelled) return;
        const currentRole = body.user?.role;
        if (currentRole === "admin" || currentRole === "dental_assistant") {
          setRole(currentRole);
          setLoading(false);
        } else {
          window.location.assign("/patient/dashboard");
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          window.location.assign("/login");
        } else {
          setRole("guest");
          setLoading(false);
          setError("Unable to verify your session.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (role === "pending" || role === "guest") return;
    refresh();
  }, [role, refresh]);

  if (role === "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6]">
        <p role="status" className="text-sm font-semibold text-slate-600">Checking session...</p>
      </main>
    );
  }

  const canAct = role === "admin";

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      <StaffHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Compliance Review</h1>
        {canAct ? (
          <p className="mt-1 text-sm text-slate-600">Review flagged accounts and manage suspensions.</p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Review queue. Suspension actions require an admin.</p>
        )}

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-red-300 px-4 font-bold"
            >
              Try again
            </button>
          </div>
        ) : null}

        <section aria-labelledby="flagged-heading" className="mt-8">
          <h2 id="flagged-heading" className="text-lg font-black text-slate-900">Flagged for review</h2>
          {loading ? (
            <p role="status" className="mt-4 text-sm text-slate-500">Loading flagged accounts...</p>
          ) : flagged.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No flagged accounts awaiting review.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {flagged.map((row) => (
                <FlaggedCard key={row.patient.patient_id} row={row} canAct={canAct} onChanged={refresh} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="suspended-heading" className="mt-10">
          <h2 id="suspended-heading" className="text-lg font-black text-slate-900">Suspended accounts</h2>
          {loading ? (
            <p role="status" className="mt-4 text-sm text-slate-500">Loading suspended accounts...</p>
          ) : suspended.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No accounts are currently suspended.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {suspended.map((row) => (
                <SuspendedCard key={row.patient.patient_id} row={row} canAct={canAct} onChanged={refresh} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}