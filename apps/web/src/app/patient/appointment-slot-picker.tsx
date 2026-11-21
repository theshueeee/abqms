"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { formatClinicTime } from "@/lib/datetime";

type Slot = { scheduled_datetime: string };
type Availability = {
  slots: Slot[];
  appointment_type: {
    appointment_type_id: string;
    appointment_type: string;
    default_duration_minutes: number;
  };
  doctor: { staff_id: string; full_name: string };
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

// Shared calendar + slot picker used by the booking and reschedule flows so both
// read availability from the same API and render the same controls (F-04/F-06).
export function AppointmentSlotPicker({
  onSelect,
  onAvailabilityChange,
  disabled,
}: {
  onSelect: (scheduledDatetime: string) => void;
  onAvailabilityChange?: (availability: Availability | null) => void;
  disabled?: boolean;
}) {
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
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setAvailability(null);
    setLoadingSlots(true);
    setError("");
    apiRequest<Availability>(`/appointments/availability?date=${selectedDate}`, { method: "GET" })
      .then((body) => {
        if (!cancelled) {
          setAvailability(body);
          onAvailabilityChange?.(body);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof ApiError ? requestError.message : "Unable to load available slots.",
          );
          onAvailabilityChange?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, onAvailabilityChange]);

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
      const scheduled = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour - 8, mins, 0, 0),
      );
      values.push({ value: scheduled.toISOString(), minute });
    }
    return values;
  }, [availability, selectedDate]);

  const availableSlots = availability?.slots ?? [];

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section
      className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_50px_rgba(24,33,31,0.08)] sm:p-7"
      aria-label="Date and time picker"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">
          {new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(month)}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 text-center text-xs font-bold text-slate-400" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
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
                selected
                  ? "bg-[#087b78] text-white"
                  : past
                    ? "text-slate-300"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-black text-slate-900">
          Available slots for {formatDate(parseLocalDate(selectedDate))}
        </h2>
        {loadingSlots ? (
          <p role="status" className="mt-4 text-sm text-slate-500">
            Loading available slots...
          </p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : gridSlots.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No PM slots are available for this date. Choose another date.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gridSlots.map(({ value }) => {
              const available = availableSlots.some((slot) => slot.scheduled_datetime === value);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available || disabled}
                  onClick={() => {
                    const slot = availableSlots.find((candidate) => candidate.scheduled_datetime === value);
                    if (slot) onSelect(slot.scheduled_datetime);
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
  );
}
