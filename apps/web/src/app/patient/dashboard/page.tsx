"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const UPCOMING_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "checked_in"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
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

export default function PatientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentError, setAppointmentError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

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
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link href="/patient/book" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,33,31,0.05)] hover:border-[#087b78]/40">
              <p className="text-base font-black text-[#087b78]">Book appointment</p>
              <p className="mt-2 text-sm text-slate-500">Choose a PM service, date, and available slot.</p>
            </Link>
            <Link href="/patient/dashboard#records" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,33,31,0.05)] hover:border-[#087b78]/40">
              <p className="text-base font-black text-[#087b78]">My records</p>
              <p className="mt-2 text-sm text-slate-500">Appointment records will be available from this area.</p>
            </Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-lg font-black text-slate-900">Upcoming Appointments</h2>

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
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {upcoming.map((appointment) => (
                <AppointmentCard key={appointment.appointment_id} appointment={appointment} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </PatientShell>
  );
}
