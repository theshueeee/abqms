// BR-02: a patient may reschedule only while fewer than 5 reschedules fall
// within a rolling 30-day window. The 6th inside the window is refused and
// the account is flagged (handled by the caller).
//
// RescheduleLog is the authoritative store (OQ-03). The window is rolling:
// rescheduled_at > now - 30 days, exclusive lower bound, evaluated in UTC
// instants so the Asia/Kuala_Lumpur clinic clock does not affect the count.

export const RESCHEDULE_LIMIT = 5;
export const RESCHEDULE_WINDOW_DAYS = 30;

export function rescheduleWindowStart(now: Date): Date {
  return new Date(now.getTime() - RESCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isWithinRescheduleWindow(rescheduledAt: Date, windowStart: Date): boolean {
  return rescheduledAt > windowStart;
}

export function remainingReschedules(used: number): number {
  return Math.max(0, RESCHEDULE_LIMIT - used);
}

export function isRescheduleBudgetExhausted(used: number): boolean {
  return used >= RESCHEDULE_LIMIT;
}
