import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { StaffRole } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { hashPassword } from "../src/auth/security";

const marker = `reschedule-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "correct horse battery staple";
const DEFAULT_DOCTOR_STAFF_ID = "20000000-0000-4000-8000-000000000001";
let server: Server;
let baseUrl: string;
let doctorId: string;
let patientId: string;
let appointmentTypeId: string;
let patientCookie: string;
let staffCookie: string;
let otherPatientId: string;
let otherPatientCookie: string;
let cancellationReasonId: string;

const NOW = "2030-03-01T02:00:00.000Z"; // 10:00 Asia/Kuala_Lumpur
const NOW_MS = Date.parse(NOW);
const TARGET_SLOT = "2030-03-10T05:00:00.000Z"; // 13:00 Asia/Kuala_Lumpur

// The server evaluates the BR-02 window against the mocked clinic clock, so
// seeded timestamps must be relative to NOW rather than the real wall clock.
function minutesBeforeNow(minutes: number): Date {
  return new Date(NOW_MS - minutes * 60_000);
}

function daysBeforeNow(days: number): Date {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000);
}

function email(label: string): string {
  return `${marker}-${label}@example.com`;
}

async function withClinicNow<T>(iso: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.CLINIC_MOCK_NOW;
  process.env.CLINIC_MOCK_NOW = iso;
  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env.CLINIC_MOCK_NOW;
    } else {
      process.env.CLINIC_MOCK_NOW = previous;
    }
  }
}

async function createAppointment(
  scheduledDatetime: string,
  ownerPatientId: string,
  status = "confirmed",
): Promise<string> {
  const appointment = await prisma.appointment.create({
    data: {
      patient_id: ownerPatientId,
      appointment_type_id: appointmentTypeId,
      doctor_staff_id: doctorId,
      scheduled_datetime: new Date(scheduledDatetime),
      booking_channel: "online",
      status: status as never,
    },
  });
  return appointment.appointment_id;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "expected a session cookie");
  return cookie;
}

async function reschedule(
  appointmentId: string,
  cookie: string,
  scheduledDatetime: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request(`/api/appointments/${appointmentId}/reschedule`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ scheduled_datetime: scheduledDatetime }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function cancel(
  appointmentId: string,
  cookie: string,
  reasonId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request(`/api/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ cancellation_reason_id: reasonId }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

// Writes a reschedule log row directly so window-boundary cases can be set up
// without performing the reschedules themselves.
async function seedRescheduleLog(
  patient: string,
  appointmentId: string,
  rescheduledAt: Date,
): Promise<void> {
  await prisma.rescheduleLog.create({
    data: {
      appointment_id: appointmentId,
      patient_id: patient,
      old_scheduled_datetime: new Date("2030-02-01T05:00:00.000Z"),
      new_scheduled_datetime: new Date("2030-02-02T05:00:00.000Z"),
      reason: "Seeded for window test",
      rescheduled_at: rescheduledAt,
    },
  });
}

before(async () => {
  process.env.CLINIC_MOCK_NOW = NOW;
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;

  const doctor = await prisma.staff.create({
    data: {
      full_name: "Reschedule Doctor",
      email: email("doctor"),
      phone_number: "0123456789",
      role: StaffRole.dental_assistant,
      password_hash: await hashPassword(password),
    },
  });
  doctorId = doctor.staff_id;

  const staffLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: doctor.email, password }),
  });
  staffCookie = cookieFrom(staffLogin);

  const patientSignup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Reschedule Patient",
      email: email("patient"),
      phone_number: "0123456789",
      date_of_birth: "1998-01-01",
      password,
    }),
  });
  patientCookie = cookieFrom(patientSignup);
  const patient = await prisma.patient.findUniqueOrThrow({ where: { email: email("patient") } });
  patientId = patient.patient_id;

  const otherSignup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Other Patient",
      email: email("other"),
      phone_number: "0123456789",
      date_of_birth: "1995-05-05",
      password,
    }),
  });
  otherPatientCookie = cookieFrom(otherSignup);
  const other = await prisma.patient.findUniqueOrThrow({ where: { email: email("other") } });
  otherPatientId = other.patient_id;

  const appointmentType = await prisma.appointmentType.create({
    data: {
      appointment_type: "Reschedule Checkup",
      default_duration_minutes: 30,
      is_active: true,
    },
  });
  appointmentTypeId = appointmentType.appointment_type_id;

  const cancellationReason = await prisma.cancellationReason.findFirstOrThrow({
    where: { is_active: true, is_system: false },
  });
  cancellationReasonId = cancellationReason.reason_id;
});

// Each test starts from a clean slate: the BR-02 budget is per patient, so
// leftover logs from an earlier test would otherwise exhaust it.
beforeEach(async () => {
  await prisma.rescheduleLog.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.suspensionRecord.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.patient.update({
    where: { patient_id: patientId },
    data: { account_status: "active", suspension_reason: null },
  });
  await prisma.patient.update({
    where: { patient_id: otherPatientId },
    data: { account_status: "active", suspension_reason: null },
  });
});

after(async () => {
  delete process.env.CLINIC_MOCK_NOW;
  await prisma.rescheduleLog.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.suspensionRecord.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.appointment.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.timeBlock.deleteMany({ where: { doctor_staff_id: doctorId } });
  await prisma.appointmentType.deleteMany({ where: { appointment_type_id: appointmentTypeId } });
  await prisma.auditLog.deleteMany({ where: { resource: "/appointments" } });
  await prisma.auditLog.deleteMany({ where: { resource: { startsWith: "/appointments/" } } });
  await prisma.session.deleteMany({
    where: {
      OR: [{ patient_id: patientId }, { patient_id: otherPatientId }, { staff_id: doctorId }],
    },
  });
  await prisma.patient.deleteMany({
    where: { patient_id: { in: [patientId, otherPatientId] } },
  });
  await prisma.staff.deleteMany({ where: { staff_id: doctorId } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("reschedule writes a RescheduleLog row and moves the booking", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const result = await reschedule(appointmentId, patientCookie, "2030-03-11T06:00:00.000Z");
  assert.equal(result.status, 200, JSON.stringify(result.body));

  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.scheduled_datetime.toISOString(), "2030-03-11T06:00:00.000Z");

  const log = await prisma.rescheduleLog.findFirstOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(log.patient_id, patientId);
  assert.equal(log.old_scheduled_datetime.toISOString(), TARGET_SLOT);
  assert.equal(log.new_scheduled_datetime.toISOString(), "2030-03-11T06:00:00.000Z");
  assert.equal(log.reason, "Patient requested reschedule");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/appointments/${appointmentId}/reschedule` },
  });
  assert.ok(audit, "expected a reschedule audit row");
  const details = audit.details as { outcome?: string };
  assert.equal(details.outcome, "rescheduled");
});

test("four prior reschedules still allow a fifth", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  for (let index = 0; index < 4; index += 1) {
    await seedRescheduleLog(
      patientId,
      appointmentId,
      minutesBeforeNow(index + 1),
    );
  }
  const result = await reschedule(appointmentId, patientCookie, "2030-03-12T06:00:00.000Z");
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.reschedules_used, 5);
  assert.equal(result.body.reschedules_remaining, 0);
});
test("a sixth reschedule inside the window is refused and flags the account", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  for (let index = 0; index < 5; index += 1) {
    await seedRescheduleLog(
      patientId,
      appointmentId,
      minutesBeforeNow(index + 1),
    );
  }
  const result = await reschedule(appointmentId, patientCookie, "2030-03-12T07:00:00.000Z");
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.equal(result.body.error, "Reschedule limit reached");
  assert.equal(result.body.flagged, true);
  assert.equal(result.body.reschedules_used, 5);

  const suspension = await prisma.suspensionRecord.findFirst({
    where: { patient_id: patientId },
  });
  assert.ok(suspension, "expected a suspension record");
  assert.equal(suspension.triggered_by, "system");
  assert.equal(suspension.outcome, "pending");

  const patient = await prisma.patient.findUniqueOrThrow({ where: { patient_id: patientId } });
  assert.equal(patient.account_status, "flagged");

  // The booking itself is unchanged.
  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.scheduled_datetime.toISOString(), TARGET_SLOT);
});

test("a reschedule older than 30 days no longer counts", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const thirtyOneDaysAgo = daysBeforeNow(31);
  await seedRescheduleLog(patientId, appointmentId, thirtyOneDaysAgo);
  for (let index = 0; index < 4; index += 1) {
    await seedRescheduleLog(
      patientId,
      appointmentId,
      minutesBeforeNow(index + 1),
    );
  }
  const result = await reschedule(appointmentId, patientCookie, "2030-03-13T06:00:00.000Z");
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.reschedules_used, 5);
});

test("a reschedule exactly 30 days and one second old is excluded", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const justOutside = new Date(NOW_MS - 30 * 24 * 60 * 60 * 1000 - 1000);
  await seedRescheduleLog(patientId, appointmentId, justOutside);
  for (let index = 0; index < 4; index += 1) {
    await seedRescheduleLog(
      patientId,
      appointmentId,
      minutesBeforeNow(index + 1),
    );
  }
  const result = await reschedule(appointmentId, patientCookie, "2030-03-14T06:00:00.000Z");
  assert.equal(result.status, 200, JSON.stringify(result.body));
});

test("rescheduling onto a taken slot is refused", async () => {
  const first = await createAppointment("2030-03-15T05:00:00.000Z", patientId);
  const second = await createAppointment("2030-03-16T05:00:00.000Z", patientId);
  const result = await reschedule(second, patientCookie, "2030-03-15T05:00:00.000Z");
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.equal(result.body.error, "Time slot is already taken");

  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: second },
  });
  assert.equal(stored.scheduled_datetime.toISOString(), "2030-03-16T05:00:00.000Z");
  assert.ok(first);
});

test("rescheduling onto a blocked slot is refused", async () => {
  const appointmentId = await createAppointment("2030-03-17T05:00:00.000Z", patientId);
  const block = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-03-18T05:00:00.000Z",
      end_datetime: "2030-03-18T06:00:00.000Z",
      block_reason: "Academic duty",
    }),
  });
  assert.equal(block.status, 201, await block.text());

  const result = await reschedule(appointmentId, patientCookie, "2030-03-18T05:00:00.000Z");
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.equal(result.body.error, "Time slot overlaps an active time block");
});

test("rescheduling outside PM hours or the slot grid is refused", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);

  // 09:00 Asia/Kuala_Lumpur — before the PM window.
  const early = await reschedule(appointmentId, patientCookie, "2030-03-20T01:00:00.000Z");
  assert.equal(early.status, 409, JSON.stringify(early.body));
  assert.equal(early.body.error, "Scheduled time must be within PM hours");

  // 12:15 Asia/Kuala_Lumpur — off the 30-minute grid.
  const offGrid = await reschedule(appointmentId, patientCookie, "2030-03-20T04:15:00.000Z");
  assert.equal(offGrid.status, 400, JSON.stringify(offGrid.body));
  assert.equal(offGrid.body.error, "Scheduled time must use the 30-minute slot grid");
});

test("rescheduling a cancelled appointment is refused", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  await prisma.appointment.update({
    where: { appointment_id: appointmentId },
    data: {
      status: "cancelled",
      cancellation_reason_id: cancellationReasonId,
      cancelled_by_patient_id: patientId,
    },
  });
  const result = await reschedule(appointmentId, patientCookie, "2030-03-21T06:00:00.000Z");
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.match(String(result.body.error), /cannot be rescheduled from status cancelled/);
});

test("another patient cannot reschedule the appointment", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const result = await reschedule(appointmentId, otherPatientCookie, "2030-03-22T06:00:00.000Z");
  assert.equal(result.status, 403, JSON.stringify(result.body));
  assert.equal(result.body.error, "Cannot reschedule another appointment");
});

test("cancel requires an active cancellation reason", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);

  const missing = await request(`/api/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: patientCookie },
    body: JSON.stringify({}),
  });
  assert.equal(missing.status, 400, await missing.text());

  const unknown = await cancel(appointmentId, patientCookie, "40000000-0000-4000-8000-000000000009");
  assert.equal(unknown.status, 404, JSON.stringify(unknown.body));
  assert.equal(unknown.body.error, "Cancellation reason not found");

  const inactiveReason = await prisma.cancellationReason.create({
    data: { reason_text: "Inactive reason", is_active: false, is_system: false },
  });
  const inactive = await cancel(appointmentId, patientCookie, inactiveReason.reason_id);
  assert.equal(inactive.status, 404, JSON.stringify(inactive.body));

  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.status, "confirmed");
});

test("cancel records exactly one actor", async () => {
  const patientAppointment = await createAppointment(TARGET_SLOT, patientId);
  const patientCancel = await cancel(patientAppointment, patientCookie, cancellationReasonId);
  assert.equal(patientCancel.status, 200, JSON.stringify(patientCancel.body));

  const afterPatient = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: patientAppointment },
  });
  assert.equal(afterPatient.status, "cancelled");
  assert.equal(afterPatient.cancelled_by_patient_id, patientId);
  assert.equal(afterPatient.cancelled_by_staff_id, null);
  assert.equal(afterPatient.cancellation_reason_id, cancellationReasonId);

  const staffAppointment = await createAppointment("2030-03-23T05:00:00.000Z", patientId);
  const staffCancel = await cancel(staffAppointment, staffCookie, cancellationReasonId);
  assert.equal(staffCancel.status, 200, JSON.stringify(staffCancel.body));

  const afterStaff = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: staffAppointment },
  });
  assert.equal(afterStaff.cancelled_by_staff_id, doctorId);
  assert.equal(afterStaff.cancelled_by_patient_id, null);
});

test("cancelling twice is refused", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const first = await cancel(appointmentId, patientCookie, cancellationReasonId);
  assert.equal(first.status, 200, JSON.stringify(first.body));

  const second = await cancel(appointmentId, patientCookie, cancellationReasonId);
  assert.equal(second.status, 409, JSON.stringify(second.body));
  assert.match(String(second.body.error), /already cancelled/);
});

test("another patient cannot cancel the appointment", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId);
  const result = await cancel(appointmentId, otherPatientCookie, cancellationReasonId);
  assert.equal(result.status, 403, JSON.stringify(result.body));
  assert.equal(result.body.error, "Cannot cancel another appointment");
});

test("declining a no-show reschedule cancels the appointment", async () => {
  const appointmentId = await createAppointment(TARGET_SLOT, patientId, "no_show");
  const result = await cancel(appointmentId, patientCookie, cancellationReasonId);
  assert.equal(result.status, 200, JSON.stringify(result.body));

  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.status, "cancelled");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/appointments/${appointmentId}/cancel` },
  });
  assert.ok(audit, "expected a cancel audit row");
  const details = audit.details as { path?: string };
  assert.equal(details.path, "decline_reschedule");
});

test("policy limits reports usage and remaining budget", async () => {
  // Uses the second patient so the count is not polluted by earlier tests.
  const appointmentId = await createAppointment(TARGET_SLOT, otherPatientId);
  await seedRescheduleLog(otherPatientId, appointmentId, minutesBeforeNow(1));

  const response = await request("/api/appointments/policy-limits", {
    headers: { cookie: otherPatientCookie },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    limit: number;
    window_days: number;
    used: number;
    remaining: number;
  };
  assert.equal(body.limit, 5);
  assert.equal(body.window_days, 30);
  assert.equal(body.used, 1);
  assert.equal(body.remaining, 4);

  // Staff must name the patient they are asking about.
  const staffWithoutPatient = await request("/api/appointments/policy-limits", {
    headers: { cookie: staffCookie },
  });
  assert.equal(staffWithoutPatient.status, 400);

  const staffWithPatient = await request(
    `/api/appointments/policy-limits?patient_id=${otherPatientId}`,
    { headers: { cookie: staffCookie } },
  );
  assert.equal(staffWithPatient.status, 200);
  const staffBody = await staffWithPatient.json() as { used: number };
  assert.equal(staffBody.used, 1);
});
