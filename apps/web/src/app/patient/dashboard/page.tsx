"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { formatClinicTime } from "@/lib/datetime";
import { PatientShell } from "../../patient-shell";

type AppointmentStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

type Appointment = {
  appointment_id: string;
  scheduled_datetime: string;
  status: AppointmentStatus;
  appointment_type: { appointment_type: string };
  doctor: { full_name: string };
};

type PolicyLimits = {
  limit: number;
  window_days: number;
  used: number;
  remaining: number;
};

const UPCOMING_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "checked_in"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  checked_in: "border-teal-200 bg-teal-50 text-[#087b78]",
};

function formatClinicDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", ...options }).format(new Date(value));
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function DoctorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function StatusChip({ status }: { status: AppointmentStatus }) {
  const style = STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const scheduled = appointment.scheduled_datetime;
  const fullDate = formatClinicDate(scheduled, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(24,33,31,0.05)]">
      <div className="flex items-start gap-4">
        <time
          dateTime={scheduled}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-50 text-slate-700"
        >
          <span aria-hidden="true" className="text-[10px] font-black uppercase tracking-wide">
            {formatClinicDate(scheduled, { month: "short" }).toUpperCase()}
          </span>
          <span aria-hidden="true" className="text-2xl font-black leading-none">
            {formatClinicDate(scheduled, { day: "numeric" })}
          </span>
          <span className="sr-only">{fullDate}</span>
        </time>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-slate-900">{appointment.appointment_type.appointment_type}</h3>
            <StatusChip status={appointment.status} />
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ClockIcon />
            <span>
              {formatClinicDate(scheduled, { weekday: "short" })}, {formatClinicTime(scheduled)}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <DoctorIcon />
            {appointment.doctor.full_name}
          </p>
        </div>
      </div>
    </li>
  );
}

function QuickActionTile({
  href,
  label,
  icon,
  tone = "brand",
}: {
  href: string;
  label: string;
  icon: ReactNode;
  tone?: "brand" | "danger";
}) {
  const iconStyle = tone === "danger" ? "text-red-600 bg-red-50" : "text-[#087b78] bg-[#087b78]/10";
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_10px_30px_rgba(24,33,31,0.05)] hover:border-[#087b78]/40"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconStyle}`}>{icon}</span>
      <span className="text-sm font-black text-slate-900">{label}</span>
    </Link>
  );
}

function PolicyLimitsPanel({
  limits,
  loading,
  error,
}: {
  limits: PolicyLimits | null;
  loading: boolean;
  error: string;
}) {
  if (loading) {
    return (
      <p role="status" className="mt-4 text-sm text-slate-500">
        Loading policy limits...
      </p>
    );
  }
  if (error || !limits) {
    return (
      <p role="alert" className="mt-4 text-sm text-red-700">
        {error || "Unable to load policy limits."}
      </p>
    );
  }

  const percentUsed = limits.limit > 0 ? Math.min(100, (limits.used / limits.limit) * 100) : 0;
  const exhausted = limits.remaining === 0;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(24,33,31,0.05)]">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#087b78]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 12a8 8 0 1 1 2.3 5.6M4 12H2m2 0V8" />
          <path d="M12 8v4l3 2" />
        </svg>
        <p className="text-sm font-black text-slate-900">Reschedule allowance</p>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        You have used {limits.used} of {limits.limit} reschedules in the last {limits.window_days} days.
      </p>
      <div
        role="progressbar"
        aria-valuenow={limits.used}
        aria-valuemin={0}
        aria-valuemax={limits.limit}
        aria-label="Reschedules used"
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full ${exhausted ? "bg-amber-500" : "bg-[#087b78]"}`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900">{limits.remaining}</span>
        <span className="text-sm font-bold text-slate-500">
          {exhausted ? "No reschedules remaining" : "remaining"}
        </span>
      </p>
    </div>
  );
}

export default function PatientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentError, setAppointmentError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [policyLimits, setPolicyLimits] = useState<PolicyLimits | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [limitsError, setLimitsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingAppointments(true);
    setAppointmentError("");
    apiRequest<{ appointments: Appointment[] }>("/appointments", { method: "GET" })
      .then((body) => {
        if (!cancelled) setAppointments(body.appointments);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setAppointmentError(requestError instanceof ApiError ? requestError.message : "Unable to load appointments.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAppointments(false);
      });
    return () => { cancelled = true; };
  }, [reloadToken]);

  // BR-02 allowance shown in the Policy Limits panel (F-06).
  useEffect(() => {
    let cancelled = false;
    setLoadingLimits(true);
    setLimitsError("");
    apiRequest<PolicyLimits>("/appointments/policy-limits", { method: "GET" })
      .then((body) => {
        if (!cancelled) setPolicyLimits(body);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLimitsError(requestError instanceof ApiError ? requestError.message : "Unable to load policy limits.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLimits(false);
      });
    return () => { cancelled = true; };
  }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((appointment) =>
        UPCOMING_STATUSES.includes(appointment.status) &&
        new Date(appointment.scheduled_datetime).getTime() >= now)
      .sort((left, right) =>
        new Date(left.scheduled_datetime).getTime() - new Date(right.scheduled_datetime).getTime());
  }, [appointments]);

  return (
    <PatientShell active="home">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">UM Dentistry</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Good morning
            </h1>
          </div>
          <button type="button" aria-label="Notifications" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
          </button>
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(24,33,31,0.08)]" aria-labelledby="queue-heading">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#087b78]">Queue status</p>
              <h2 id="queue-heading" className="mt-2 text-xl font-black text-slate-900">General Outpatient Clinic</h2>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">Unavailable</span>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-8 text-center">
            <p className="text-sm text-slate-500">Live queue information is not available yet.</p>
            <Link href="/patient/book" className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[#087b78] px-6 text-sm font-black text-white hover:bg-[#066764]">
              Book an appointment
            </Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="text-lg font-black text-slate-900">Quick actions</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionTile
              href="/patient/book"
              label="Book Appt"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M7 3v4M17 3v4M3 10h18" />
                </svg>
              }
            />
            <QuickActionTile
              href="/patient/reschedule"
              label="Reschedule"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 1 2.3 5.6M4 12H2m2 0V8" />
                  <path d="M12 8v4l3 2" />
                </svg>
              }
            />
            <QuickActionTile
              href="/patient/cancel"
              label="Cancel Visit"
              tone="danger"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              }
            />
            <QuickActionTile
              href="/patient/dashboard#records"
              label="My Records"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6" />
                </svg>
              }
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-labelledby="upcoming-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="upcoming-heading" className="text-lg font-black text-slate-900">
                Upcoming Appointments
              </h2>
              <span className="text-sm font-bold text-[#087b78]">View All</span>
            </div>

            {loadingAppointments ? (
              <p role="status" className="mt-4 text-sm text-slate-500">Loading appointments...</p>
            ) : appointmentError ? (
              <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                <p>{appointmentError}</p>
                <button
                  type="button"
                  onClick={() => setReloadToken((token) => token + 1)}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-red-300 px-4 font-bold"
                >
                  Try again
                </button>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">No upcoming appointments.</p>
                <Link href="/patient/book" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-black text-white hover:bg-[#066764]">
                  Book an appointment
                </Link>
              </div>
            ) : (
              <ul className="mt-4 grid gap-4">
                {upcoming.map((appointment) => (
                  <AppointmentCard key={appointment.appointment_id} appointment={appointment} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="policy-limits-heading">
            <h2 id="policy-limits-heading" className="text-lg font-black text-slate-900">
              Policy Limits
            </h2>
            <PolicyLimitsPanel limits={policyLimits} loading={loadingLimits} error={limitsError} />
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
