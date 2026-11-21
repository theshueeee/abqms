"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import { formatClinicTime } from "@/lib/datetime";
import { PatientShell } from "../../patient-shell";
import { AppointmentSlotPicker } from "../appointment-slot-picker";

type AppointmentType = {
  appointment_type_id: string;
  appointment_type: string;
  default_duration_minutes: number;
};

type Doctor = {
  staff_id: string;
  full_name: string;
};

type Appointment = {
  appointment_id: string;
  scheduled_datetime: string;
  appointment_type: AppointmentType;
  doctor: Doctor;
};

type Availability = {
  slots: Array<{ scheduled_datetime: string }>;
  appointment_type: AppointmentType;
  doctor: Doctor;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}

export default function PatientBookingPage() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Appointment | null>(null);

  const handleAvailabilityChange = useCallback((next: Availability | null) => {
    setAvailability(next);
  }, []);

  async function chooseSlot(scheduledDatetime: string) {
    if (submitting || success) return;
    setSubmitting(true);
    setError("");
    try {
      const body = await apiRequest<{ appointment: Appointment }>("/appointments", {
        method: "POST",
        body: JSON.stringify({ scheduled_datetime: scheduledDatetime }),
      });
      setSuccess(body.appointment);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create the appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PatientShell active="book">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-5xl px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10">
        <header className="hidden items-center justify-between border-b border-slate-200 pb-5 lg:flex">
          <Link href="/patient/dashboard" className="text-sm font-bold text-slate-600">× Cancel</Link>
          <p className="text-xl font-black text-[#087b78]">UM Dentistry</p>
          <span className="w-16" />
        </header>
        <header className="flex items-center justify-between lg:hidden">
          <Link href="/patient/dashboard" className="text-sm font-bold text-slate-700">× Cancel</Link>
          <p className="font-black text-[#087b78]">UM Dentistry</p>
        </header>

        {success ? (
          <section className="mx-auto mt-10 max-w-xl rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-[0_18px_50px_rgba(24,33,31,0.08)]" role="status" aria-live="polite">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</span>
            <h1 className="mt-5 text-2xl font-black text-slate-900">Appointment booked</h1>
            <p className="mt-3 text-sm text-slate-600">
              {success.appointment_type.appointment_type} · {success.doctor.full_name}
            </p>
            <p className="mt-2 text-base font-bold text-[#087b78]">
              {formatDate(new Date(success.scheduled_datetime))} · {formatClinicTime(success.scheduled_datetime)}
            </p>
            <Link href="/patient/dashboard" className="mt-6 flex h-12 items-center justify-center rounded-full bg-[#087b78] px-5 text-sm font-black text-white">
              Return to dashboard
            </Link>
          </section>
        ) : (
          <>
            <ol className="mx-auto mt-8 flex max-w-xl items-center" aria-label="Booking progress">
              {["Service", "Time", "Confirm"].map((label, index) => (
                <li key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${index < 1 ? "bg-[#087b78] text-white" : index === 1 ? "border-2 border-[#087b78] bg-white text-[#087b78]" : "border border-slate-300 bg-white text-slate-400"}`}>
                      {index < 1 ? "✓" : index + 1}
                    </span>
                    <span className={`mt-2 text-sm font-bold ${index === 1 ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  </div>
                  {index < 2 ? <span className={`mb-6 h-px flex-1 ${index === 0 ? "bg-[#087b78]" : "bg-slate-300"}`} /> : null}
                </li>
              ))}
            </ol>

            <div className="mt-8">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Pick Date &amp; Time</h1>
              <p className="mt-2 text-base text-slate-600">
                {availability
                  ? `${availability.appointment_type.appointment_type} - General Outpatient Clinic`
                  : "Loading service"}
              </p>
            </div>

            {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <AppointmentSlotPicker
              onSelect={chooseSlot}
              onAvailabilityChange={handleAvailabilityChange}
              disabled={submitting}
            />
          </>
        )}
      </div>
    </PatientShell>
  );
}
