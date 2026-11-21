import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { StaffRole } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { hashPassword } from "../src/auth/security";

const marker = `appointment-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "correct horse battery staple";
const DEFAULT_APPOINTMENT_TYPE_ID = "10000000-0000-4000-8000-000000000001";
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

const CHECKIN_SLOT = "2030-02-10T05:00:00.000Z"; // 13:00 Asia/Kuala_Lumpur

function email(label: string): string {
  return `${marker}-${label}@example.com`;
}

// Runs a block against a fixed clinic clock and restores the previous value.
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

// Creates an appointment directly so check-in tests control the exact schedule.
// A `cancelled` row must satisfy the cancel contract (OQ-09): a reason and
// exactly one actor are enforced by database CHECK constraints.
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
      ...(status === "cancelled"
        ? {
            cancellation_reason_id: cancellationReasonId,
            cancelled_by_patient_id: ownerPatientId,
          }
        : {}),
    },
  });
  return appointment.appointment_id;
}

async function checkin(
  appointmentId: string,
  cookie: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request(`/api/appointments/${appointmentId}/checkin`, {
    method: "POST",
    headers: { cookie },
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "expected a session cookie");
  return cookie;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

before(async () => {
  process.env.CLINIC_MOCK_NOW = "2029-01-10T07:00:00.000Z";
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;

  const doctor = await prisma.staff.create({
    data: {
      full_name: "Appointment Doctor",
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
      full_name: "Appointment Patient",
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
      appointment_type: "General Checkup",
      default_duration_minutes: 30,
      is_active: true,
    },
  });
  appointmentTypeId = appointmentType.appointment_type_id;

  // Seeded by the F-06 migration; used to satisfy the cancel contract (OQ-09).
  const cancellationReason = await prisma.cancellationReason.findFirstOrThrow({
    where: { is_active: true, is_system: false },
  });
  cancellationReasonId = cancellationReason.reason_id;
});

after(async () => {
  delete process.env.CLINIC_MOCK_NOW;
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

test("availability excludes occupied and blocked PM slots", async () => {
  const scheduled = "2030-01-10T05:00:00.000Z";
  const booking = await request("/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: patientCookie },
    body: JSON.stringify({
      appointment_type_id: appointmentTypeId,
      doctor_staff_id: doctorId,
      scheduled_datetime: scheduled,
    }),
  });
  assert.equal(booking.status, 201);

  const conflictingBlock = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-01-10T05:00:00.000Z",
      end_datetime: "2030-01-10T06:00:00.000Z",
      block_reason: "Conflicts with appointment",
    }),
  });
  assert.equal(conflictingBlock.status, 409);

  const block = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-01-10T05:30:00.000Z",
      end_datetime: "2030-01-10T06:30:00.000Z",
      block_reason: "Academic duty",
    }),
  });
  if (block.status !== 201) {
    throw new Error(`allowed block failed: ${block.status} ${await block.text()}`);
  }

  const availability = await request(
    `/api/appointments/availability?date=2030-01-10&doctor_staff_id=${doctorId}&appointment_type_id=${appointmentTypeId}`,
    { headers: { cookie: patientCookie } },
  );
  assert.equal(availability.status, 200);
  const payload = await availability.json() as { slots: Array<{ scheduled_datetime: string }> };
  assert.equal(payload.slots.some((slot) => slot.scheduled_datetime === scheduled), false);

  const repeated = await request("/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: patientCookie },
    body: JSON.stringify({
      appointment_type_id: appointmentTypeId,
      doctor_staff_id: doctorId,
      scheduled_datetime: scheduled,
    }),
  });
  assert.equal(repeated.status, 409);
});

test("patients list only their own appointments and reference data is readable", async () => {
  const own = await request("/api/appointments", { headers: { cookie: patientCookie } });
  assert.equal(own.status, 200);
  const ownPayload = await own.json() as { appointments: Array<{ patient_id: string }> };
  assert.ok(ownPayload.appointments.every((appointment) => appointment.patient_id === patientId));

  const types = await request("/api/appointment-types", { headers: { cookie: patientCookie } });
  assert.equal(types.status, 200);
  const doctors = await request("/api/doctors", { headers: { cookie: patientCookie } });
  assert.equal(doctors.status, 200);
});

test("availability resolves default resources and excludes elapsed PM slots", async () => {
  const previousMockNow = process.env.CLINIC_MOCK_NOW;
  process.env.CLINIC_MOCK_NOW = "2030-01-10T05:30:00.000Z"; // 13:30 Asia/Kuala_Lumpur
  try {
    const availability = await request("/api/appointments/availability?date=2030-01-10", {
      headers: { cookie: patientCookie },
    });
    assert.equal(availability.status, 200);
    const payload = await availability.json() as {
      slots: Array<{ scheduled_datetime: string }>;
      appointment_type: { appointment_type_id: string };
      doctor: { staff_id: string };
    };
    assert.equal(payload.appointment_type.appointment_type_id, DEFAULT_APPOINTMENT_TYPE_ID);
    assert.equal(payload.doctor.staff_id, DEFAULT_DOCTOR_STAFF_ID);
    assert.deepEqual(
      payload.slots.map((slot) => slot.scheduled_datetime),
      [
        "2030-01-10T06:00:00.000Z",
        "2030-01-10T06:30:00.000Z",
        "2030-01-10T07:00:00.000Z",
        "2030-01-10T07:30:00.000Z",
        "2030-01-10T08:00:00.000Z",
        "2030-01-10T08:30:00.000Z",
      ],
    );
  } finally {
    if (previousMockNow === undefined) {
      delete process.env.CLINIC_MOCK_NOW;
    } else {
      process.env.CLINIC_MOCK_NOW = previousMockNow;
    }
  }
});

test("booking resolves defaults and is not gated by the current PM clock", async () => {
  const previousMockNow = process.env.CLINIC_MOCK_NOW;
  process.env.CLINIC_MOCK_NOW = "2030-01-11T15:00:00.000Z"; // 23:00 Asia/Kuala_Lumpur
  try {
    const booking = await request("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: patientCookie },
      body: JSON.stringify({ scheduled_datetime: "2030-01-12T04:00:00.000Z" }),
    });
    if (booking.status !== 201) {
      throw new Error(`default booking failed: ${booking.status} ${await booking.text()}`);
    }
    const payload = await booking.json() as {
      appointment: {
        appointment_type_id: string;
        doctor_staff_id: string;
        scheduled_datetime: string;
        status: string;
      };
    };
    assert.equal(payload.appointment.appointment_type_id, DEFAULT_APPOINTMENT_TYPE_ID);
    assert.equal(payload.appointment.doctor_staff_id, DEFAULT_DOCTOR_STAFF_ID);
    assert.equal(payload.appointment.scheduled_datetime, "2030-01-12T04:00:00.000Z");
    assert.equal(payload.appointment.status, "confirmed");
  } finally {
    if (previousMockNow === undefined) {
      delete process.env.CLINIC_MOCK_NOW;
    } else {
      process.env.CLINIC_MOCK_NOW = previousMockNow;
    }
  }
});

test("check-in succeeds inside the window and records the transition", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  // 13:10 Asia/Kuala_Lumpur — ten minutes after the slot time.
  const result = await withClinicNow("2030-02-10T05:10:00.000Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(result.status, 200);
  const appointment = result.body.appointment as { status: string };
  assert.equal(appointment.status, "checked_in");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/appointments/${appointmentId}/checkin` },
  });
  assert.ok(audit, "expected a check-in audit row");
  const details = audit.details as { outcome?: string };
  assert.equal(details.outcome, "checked_in");
});

test("check-in window boundary is inclusive at exactly 15 minutes", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  // 13:15 Asia/Kuala_Lumpur — exactly 15 minutes after the slot time.
  const result = await withClinicNow("2030-02-10T05:15:00.000Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(result.status, 200);
  const appointment = result.body.appointment as { status: string };
  assert.equal(appointment.status, "checked_in");
});

test("check-in one millisecond past the window marks a no-show and prompts a reschedule", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  const result = await withClinicNow("2030-02-10T05:15:00.001Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(result.status, 409);
  assert.equal(result.body.reschedule_required, true);
  const appointment = result.body.appointment as { status: string };
  assert.equal(appointment.status, "no_show");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/appointments/${appointmentId}/checkin` },
  });
  assert.ok(audit, "expected a no-show audit row");
  const details = audit.details as { outcome?: string };
  assert.equal(details.outcome, "no_show");
});

test("check-in is refused before the scheduled time", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  // 12:55 Asia/Kuala_Lumpur — five minutes before the slot time.
  const result = await withClinicNow("2030-02-10T04:55:00.000Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(result.status, 409);
  assert.match(String(result.body.error), /Check-in opens at the scheduled time/);
  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.status, "confirmed");
});

test("check-in is refused for terminal appointment statuses", async () => {
  for (const status of ["cancelled", "no_show", "completed"]) {
    const appointmentId = await createAppointment(CHECKIN_SLOT, patientId, status);
    const result = await withClinicNow("2030-02-10T05:05:00.000Z", () =>
      checkin(appointmentId, patientCookie),
    );
    assert.equal(result.status, 409, `expected ${status} to be refused`);
    assert.match(String(result.body.error), /cannot be checked in from status/);
    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { appointment_id: appointmentId },
    });
    assert.equal(stored.status, status);
  }
});

test("repeat check-in on a checked-in appointment is refused", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  const first = await withClinicNow("2030-02-10T05:05:00.000Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(first.status, 200);

  const second = await withClinicNow("2030-02-10T05:06:00.000Z", () =>
    checkin(appointmentId, patientCookie),
  );
  assert.equal(second.status, 409);
  assert.match(String(second.body.error), /already checked in/);
});

test("a patient cannot check in another patient's appointment", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, patientId);
  const result = await withClinicNow("2030-02-10T05:05:00.000Z", () =>
    checkin(appointmentId, otherPatientCookie),
  );
  assert.equal(result.status, 403);
  const stored = await prisma.appointment.findUniqueOrThrow({
    where: { appointment_id: appointmentId },
  });
  assert.equal(stored.status, "confirmed");
});

test("staff can check in any patient's appointment", async () => {
  const appointmentId = await createAppointment(CHECKIN_SLOT, otherPatientId);
  const result = await withClinicNow("2030-02-10T05:05:00.000Z", () =>
    checkin(appointmentId, staffCookie),
  );
  assert.equal(result.status, 200);
  const appointment = result.body.appointment as { status: string; patient_id: string };
  assert.equal(appointment.status, "checked_in");
  assert.equal(appointment.patient_id, otherPatientId);
});

test("check-in on an unknown appointment is refused", async () => {
  const response = await request("/api/appointments/00000000-0000-4000-8000-000000000099/checkin", {
    method: "POST",
    headers: { cookie: patientCookie },
  });
  assert.equal(response.status, 404);
});
