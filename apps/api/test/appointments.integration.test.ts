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

function email(label: string): string {
  return `${marker}-${label}@example.com`;
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

  const appointmentType = await prisma.appointmentType.create({
    data: {
      appointment_type: "General Checkup",
      default_duration_minutes: 30,
      is_active: true,
    },
  });
  appointmentTypeId = appointmentType.appointment_type_id;
});

after(async () => {
  delete process.env.CLINIC_MOCK_NOW;
  await prisma.appointment.deleteMany({ where: { patient_id: patientId } });
  await prisma.timeBlock.deleteMany({ where: { doctor_staff_id: doctorId } });
  await prisma.appointmentType.deleteMany({ where: { appointment_type_id: appointmentTypeId } });
  await prisma.auditLog.deleteMany({ where: { resource: "/appointments" } });
  await prisma.session.deleteMany({
    where: {
      OR: [{ patient_id: patientId }, { staff_id: doctorId }],
    },
  });
  await prisma.patient.deleteMany({ where: { patient_id: patientId } });
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
