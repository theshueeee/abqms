"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type CancellationReason = {
  reason_id: string;
  reason_text: string;
};

const CANCELLABLE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

function formatClinicDate(value: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export default function PatientCancelPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reasonId, setReasonId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<{ appointments: Appointment[] }>("/appointments", { method: "GET" }),
      apiRequest<{ cancellation_reasons: CancellationReason[] }>("/cancellation-reasons", {
        method: "GET",
      }),
    ])
      .then(([appointmentBody, reasonBody]) => {
        if (cancelled) return;
        setAppointments(appointmentBody.appointments);
        setReasons(reasonBody.cancellation_reasons);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLoadError(
            requestError instanceof ApiError ? requestError.message : "Unable to load the cancellation form.",
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

  const cancellable = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          CANCELLABLE_STATUSES.includes(appointment.status) &&
          new Date(appointment.scheduled_datetime).getTime() > Date.now(),
      ),
    [appointments],
  );

  const selected = cancellable.find((appointment) => appointment.appointment_id === selectedId) ?? null;

  async function submit() {
    if (!selectedId || !reasonId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest(`/appointments/${selectedId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ cancellation_reason_id: reasonId }),
      });
      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : "Unable to cancel the appointment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PatientShell active="home">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Cancel visit</h1>
        <p className="mt-2 text-base text-slate-600">
          Choose the appointment to cancel and tell us why. Your slot is released for other patients.
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
            <h2 className="mt-5 text-2xl font-black text-slate-900">Appointment cancelled</h2>
            <p className="mt-3 text-sm text-slate-600">
              Your appointment has been cancelled and the slot is available again.
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
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
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
            ) : cancellable.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">No upcoming appointments to cancel.</p>
              </div>
            ) : (
              <>
                <section className="mt-6" aria-label="Appointments to cancel">
                  <h2 className="text-lg font-black text-slate-900">Select an appointment</h2>
                  <ul className="mt-4 grid gap-3">
                    {cancellable.map((appointment) => {
                      const isSelected = appointment.appointment_id === selectedId;
                      return (
                        <li key={appointment.appointment_id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedId(appointment.appointment_id);
                              setError("");
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
                  <section className="mt-8" aria-labelledby="reason-heading">
                    <h2 id="reason-heading" className="text-lg font-black text-slate-900">
                      Reason for cancelling
                    </h2>
                    <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_50px_rgba(24,33,31,0.08)] sm:p-7">
                      <label htmlFor="cancellation-reason" className="text-sm font-bold text-slate-700">
                        Choose a reason
                      </label>
                      <select
                        id="cancellation-reason"
                        value={reasonId}
                        onChange={(event) => setReasonId(event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-800"
                      >
                        <option value="">Choose a reason</option>
                        {reasons.map((reason) => (
                          <option key={reason.reason_id} value={reason.reason_id}>
                            {reason.reason_text}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={!reasonId || submitting}
                        className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-black text-white hover:bg-[#066764] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "Cancelling..." : "Cancel this appointment"}
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </PatientShell>
  );
}
