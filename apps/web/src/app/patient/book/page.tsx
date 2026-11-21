"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import { formatClinicTime } from "@/lib/datetime";
import { PatientShell } from "../../patient-shell";

type AppointmentType = {
  appointment_type_id: string;
  appointment_type: string;
  default_duration_minutes: number;
};

type Doctor = {
  staff_id: string;
  full_name: string;
};

type Slot = {
  scheduled_datetime: string;
};

type Appointment = {
  appointment_id: string;
  scheduled_datetime: string;
  appointment_type: AppointmentType;
  doctor: Doctor;
};

type Availability = {
  slots: Slot[];
  appointment_type: AppointmentType;
  doctor: Doctor;
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}

export default function PatientBookingPage() {
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);
  const defaultDate = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 1);
    return value;
  }, [today]);

  const [month, setMonth] = useState(() => new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(defaultDate));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Appointment | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAvailability(null);
    setLoadingSlots(true);
    setError("");
    // Service and doctor are clinic defaults resolved by the API (F-04).
    apiRequest<Availability>(`/appointments/availability?date=${selectedDate}`, { method: "GET" })
      .then((body) => {
        if (!cancelled) setAvailability(body);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof ApiError ? requestError.message : "Unable to load available slots.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const leading = first.getDay();
    const days: Array<Date | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      days.push(new Date(year, monthIndex, day));
    }
    return days;
  }, [month]);

  const gridSlots = useMemo(() => {
    if (!availability) return [];
    const date = parseLocalDate(selectedDate);
    const duration = availability.appointment_type.default_duration_minutes;
    const values: Array<{ value: string; minute: number }> = [];
    for (let minute = 12 * 60; minute + duration <= 17 * 60; minute += 30) {
      const hour = Math.floor(minute / 60);
      const mins = minute % 60;
      const scheduled = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour - 8, mins, 0, 0));
      values.push({ value: scheduled.toISOString(), minute });
    }
    return values;
  }, [availability, selectedDate]);

  const availableSlots = availability?.slots ?? [];

  async function chooseSlot(slot: Slot) {
    if (submitting || success) return;
    setSubmitting(true);
    setError("");
    try {
      const body = await apiRequest<{ appointment: Appointment }>("/appointments", {
        method: "POST",
        body: JSON.stringify({ scheduled_datetime: slot.scheduled_datetime }),
      });
      setSuccess(body.appointment);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create the appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
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

            <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_50px_rgba(24,33,31,0.08)] sm:p-7" aria-label="Date and time picker">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">
                  {new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(month)}
                </h2>
                <div className="flex gap-2">
                  <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300">‹</button>
                  <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300">›</button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 text-center text-xs font-bold text-slate-400" aria-hidden="true">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((date, index) => {
                  if (!date) return <span key={`empty-${index}`} />;
                  const key = localDateKey(date);
                  const past = date < today;
                  const selected = key === selectedDate;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={past}
                      aria-label={formatDate(date)}
                      aria-pressed={selected}
                      onClick={() => setSelectedDate(key)}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        selected ? "bg-[#087b78] text-white" : past ? "text-slate-300" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-black text-slate-900">Available slots for {formatDate(parseLocalDate(selectedDate))}</h2>
                {loadingSlots ? (
                  <p role="status" className="mt-4 text-sm text-slate-500">Loading available slots...</p>
                ) : gridSlots.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No PM slots are available for this date. Choose another date.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {gridSlots.map(({ value }) => {
                      const available = availableSlots.some((slot) => slot.scheduled_datetime === value);
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={!available || submitting}
                          onClick={() => {
                            const slot = availableSlots.find((candidate) => candidate.scheduled_datetime === value);
                            if (slot) void chooseSlot(slot);
                          }}
                          className={`rounded-2xl border px-4 py-4 text-left ${
                            available
                              ? "border-[#087b78] bg-[#087b78] text-white hover:bg-[#066764]"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                          } disabled:cursor-not-allowed`}
                        >
                          <span className="block text-base font-black">{formatClinicTime(value)}</span>
                          <span className="mt-1 block text-xs font-bold">{available ? "Available" : "Unavailable"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </PatientShell>
  );
}
