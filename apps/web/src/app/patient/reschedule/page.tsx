"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import { formatClinicTime } from "@/lib/datetime";
import { PatientShell } from "../../patient-shell";
import { AppointmentSlotPicker } from "../appointment-slot-picker";

type AppointmentStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

type Appointment = {
  appointment_id: string;
  scheduled_datetime: string;
  status: AppointmentStatus;
  appointment_type: { appointment_type: string };
  doctor: { full_name: string };
};

const RESCHEDULABLE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

function formatClinicDate(value: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export default function PatientReschedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [success, setSuccess] = useState<Appointment | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ appointments: Appointment[] }>("/appointments", { method: "GET" })
      .then((body) => {
        if (!cancelled) setAppointments(body.appointments);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLoadError(
            requestError instanceof ApiError ? requestError.message : "Unable to load your appointments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reschedulable = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          RESCHEDULABLE_STATUSES.includes(appointment.status) &&
          new Date(appointment.scheduled_datetime).getTime() > Date.now(),
      ),
    [appointments],
  );

  const selected = reschedulable.find((appointment) => appointment.appointment_id === selectedId) ?? null;

  async function submit(scheduledDatetime: string) {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setError("");
    setFlagged(false);
    try {
      const body = await apiRequest<{ appointment: Appointment }>(
        `/appointments/${selectedId}/reschedule`,
        {
          method: "PATCH",
          body: JSON.stringify({ scheduled_datetime: scheduledDatetime }),
        },
      );
      setSuccess(body.appointment);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
        const details = requestError.body as { flagged?: boolean } | null | undefined;
        setFlagged(details?.flagged === true);
      } else {
        setError("Unable to reschedule the appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PatientShell active="home">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Reschedule appointment</h1>
        <p className="mt-2 text-base text-slate-600">
          Choose the appointment you want to move, then pick a new PM slot.
        </p>

        {success ? (
          <section
            className="mx-auto mt-10 max-w-xl rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-[0_18px_50px_rgba(24,33,31,0.08)]"
            role="status"
            aria-live="polite"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </span>
            <h2 className="mt-5 text-2xl font-black text-slate-900">Appointment rescheduled</h2>
            <p className="mt-3 text-sm text-slate-600">
              {success.appointment_type.appointment_type} · {success.doctor.full_name}
            </p>
            <p className="mt-2 text-base font-bold text-[#087b78]">
              {formatClinicDate(success.scheduled_datetime)} ·{" "}
              {formatClinicTime(success.scheduled_datetime)}
            </p>
            <Link
              href="/patient/dashboard"
              className="mt-6 flex h-12 items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-black text-white"
            >
              Return to dashboard
            </Link>
          </section>
        ) : (
          <>
            {error ? (
              <p
                role="alert"
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  flagged
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {flagged
                  ? "You have reached the reschedule limit. Your account is flagged for review."
                  : error}
              </p>
            ) : null}

            {loading ? (
              <p role="status" className="mt-6 text-sm text-slate-500">
                Loading your appointments...
              </p>
            ) : loadError ? (
              <p role="alert" className="mt-6 text-sm text-red-700">
                {loadError}
              </p>
            ) : reschedulable.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">No upcoming appointments to reschedule.</p>
                <Link
                  href="/patient/book"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-black text-white"
                >
                  Book an appointment
                </Link>
              </div>
            ) : (
              <>
                <section className="mt-6" aria-label="Appointments to reschedule">
                  <h2 className="text-lg font-black text-slate-900">Select an appointment</h2>
                  <ul className="mt-4 grid gap-3">
                    {reschedulable.map((appointment) => {
                      const isSelected = appointment.appointment_id === selectedId;
                      return (
                        <li key={appointment.appointment_id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedId(appointment.appointment_id);
                              setError("");
                              setFlagged(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left ${
                              isSelected
                                ? "border-[#087b78] bg-[#087b78] text-white"
                                : "border-slate-200 bg-white text-slate-900 hover:border-[#087b78]/40"
                            }`}
                          >
                            <span>
                              <span className="block text-base font-black">
                                {appointment.appointment_type.appointment_type}
                              </span>
                              <span
                                className={`mt-1 block text-sm ${
                                  isSelected ? "text-white/80" : "text-slate-500"
                                }`}
                              >
                                {formatClinicDate(appointment.scheduled_datetime)} ·{" "}
                                {formatClinicTime(appointment.scheduled_datetime)}
                              </span>
                            </span>
                            <span className="text-sm font-bold">Select</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {selected ? (
                  <AppointmentSlotPicker onSelect={submit} disabled={submitting} />
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </PatientShell>
  );
}
