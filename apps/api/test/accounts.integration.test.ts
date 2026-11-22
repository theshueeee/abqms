import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { SuspensionOutcome, SuspensionTrigger, StaffRole } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { hashPassword } from "../src/auth/security";
import { OUTCOME_TO_STATUS, mapStatusFromOutcome } from "../src/moderation/mapping";

const marker = `accounts-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "correct horse battery staple";
const NOW = "2030-04-01T02:00:00.000Z"; // 10:00 Asia/Kuala_Lumpur
const TARGET_SLOT = "2030-04-10T05:00:00.000Z"; // 13:00 Asia/Kuala_Lumpur

let server: Server;
let baseUrl: string;
let adminCookie: string;
let assistantCookie: string;
let adminId: string;
let assistantId: string;
let doctorId: string;
let flaggedPatientId: string;
let patientId: string;
let appointmentTypeId: string;

function email(label: string): string {
  return `${marker}-${label}@example.com`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "expected a session cookie");
  return cookie;
}

async function createStaff(
  emailAddress: string,
  role: StaffRole,
): Promise<{ id: string; cookie: string }> {
  const staff = await prisma.staff.create({
    data: {
      full_name: `${role} Staff`,
      email: emailAddress,
      phone_number: "0123456789",
      role,
      password_hash: await hashPassword(password),
    },
  });
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: emailAddress, password }),
  });
  return { id: staff.staff_id, cookie: cookieFrom(login) };
}

// FR-MOD-01: both a system and a staff trigger produce a pending record plus a
// flagged account; reviewers select the resulting queue row in F-12.
async function seedFlag(patientUuid: string, triggeredBy: SuspensionTrigger): Promise<string> {
  const reason =
    triggeredBy === SuspensionTrigger.system
      ? "BR-02 reschedule limit exceeded"
      : "Staff-raised abuse concern";
  const record = await prisma.suspensionRecord.create({
    data: { patient_id: patientUuid, flagging_reason: reason, triggered_by: triggeredBy, outcome: "pending" },
  });
  await prisma.patient.update({
    where: { patient_id: patientUuid },
    data: { account_status: "flagged", suspension_reason: reason },
  });
  return record.suspension_id;
}

async function createPatient(label: string): Promise<string> {
  const emailAddress = email(label);
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: `${label} Patient`,
      email: emailAddress,
      phone_number: "0123456789",
      date_of_birth: "1992-06-15",
      password,
    }),
  });
  assert.equal(signup.status, 201);
  const patient = await prisma.patient.findUniqueOrThrow({ where: { email: emailAddress } });
  return patient.patient_id;
}

async function suspend(
  patientUuid: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request(`/api/accounts/${patientUuid}/suspend`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function reinstate(
  patientUuid: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await request(`/api/accounts/${patientUuid}/reinstate`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

before(async () => {
  process.env.CLINIC_MOCK_NOW = NOW;
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;

  const admin = await createStaff(email("admin"), StaffRole.admin);
  adminCookie = admin.cookie;
  adminId = admin.id;
  const assistant = await createStaff(email("assistant"), StaffRole.dental_assistant);
  assistantCookie = assistant.cookie;
  assistantId = assistant.id;

  const doctor = await prisma.staff.create({
    data: {
      full_name: "Compliance Doctor",
      email: email("doctor"),
      phone_number: "0123456789",
      role: StaffRole.dental_assistant,
      password_hash: await hashPassword(password),
    },
  });
  doctorId = doctor.staff_id;

  flaggedPatientId = await createPatient("flagged");
  patientId = await createPatient("regular");

  const appointmentType = await prisma.appointmentType.create({
    data: { appointment_type: "Compliance Checkup", default_duration_minutes: 30, is_active: true },
  });
  appointmentTypeId = appointmentType.appointment_type_id;
});

beforeEach(async () => {
  await prisma.suspensionRecord.deleteMany({ where: { patient_id: { in: [flaggedPatientId, patientId] } } });
  await prisma.auditLog.deleteMany({ where: { resource: { startsWith: "/accounts/" } } });
  await prisma.patient.updateMany({
    where: { patient_id: { in: [flaggedPatientId, patientId] } },
    data: { account_status: "active", suspension_reason: null },
  });
});

after(async () => {
  await prisma.suspensionRecord.deleteMany({ where: { patient_id: { in: [flaggedPatientId, patientId] } } });
  await prisma.appointment.deleteMany({ where: { patient_id: { in: [flaggedPatientId, patientId] } } });
  await prisma.appointmentType.deleteMany({ where: { appointment_type_id: appointmentTypeId } });
  await prisma.auditLog.deleteMany({ where: { resource: { startsWith: "/accounts/" } } });
  await prisma.session.deleteMany({ where: { staff_id: { in: [adminId, assistantId, doctorId] } } });
  await prisma.patient.deleteMany({ where: { patient_id: { in: [flaggedPatientId, patientId] } } });
  await prisma.staff.deleteMany({ where: { staff_id: { in: [adminId, assistantId, doctorId] } } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("OQ-10 maps each review outcome to the account status it produces", () => {
  assert.deepEqual(OUTCOME_TO_STATUS, {
    [SuspensionOutcome.pending]: "flagged",
    [SuspensionOutcome.suspended]: "suspended",
    [SuspensionOutcome.reinstated]: "active",
  });
  assert.equal(mapStatusFromOutcome(SuspensionOutcome.pending), "flagged");
  assert.equal(mapStatusFromOutcome(SuspensionOutcome.suspended), "suspended");
  assert.equal(mapStatusFromOutcome(SuspensionOutcome.reinstated), "active");
});

test("the flagged queue is inaccessible to patients and unauthenticated callers", async () => {
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Probe Patient",
      email: email("probe"),
      phone_number: "0123456789",
      date_of_birth: "1992-06-15",
      password,
    }),
  });
  const patientCookie = cookieFrom(signup);
  const patientCall = await request("/api/accounts/flagged", { headers: { cookie: patientCookie } });
  assert.equal(patientCall.status, 403);

  const anonymous = await request("/api/accounts/flagged");
  assert.equal(anonymous.status, 401);
});

test("the flagged queue lists patients with a pending flag and hides clean ones", async () => {
  await seedFlag(flaggedPatientId, SuspensionTrigger.system);

  const response = await request("/api/accounts/flagged", { headers: { cookie: adminCookie } });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    flagged: Array<{ patient: { patient_id: string }; flag: { flagging_reason: string } }>;
  };
  assert.ok(body.flagged.some((row) => row.patient.patient_id === flaggedPatientId), JSON.stringify(body));
  assert.ok(!body.flagged.some((row) => row.patient.patient_id === patientId), JSON.stringify(body));
  const flaggedRow = body.flagged.find((row) => row.patient.patient_id === flaggedPatientId)!;
  assert.equal(flaggedRow.flag.flagging_reason, "BR-02 reschedule limit exceeded");
});

test("suspended accounts are listed for reinstate review and clean ones are hidden", async () => {
  await seedFlag(flaggedPatientId, SuspensionTrigger.system);
  await suspend(flaggedPatientId, adminCookie, { reason: "Active for review" });

  const response = await request("/api/accounts/suspended", { headers: { cookie: adminCookie } });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    suspended: Array<{ patient: { patient_id: string }; record: { flagging_reason: string } }>;
  };
  assert.ok(body.suspended.some((row) => row.patient.patient_id === flaggedPatientId), JSON.stringify(body));
  assert.ok(!body.suspended.some((row) => row.patient.patient_id === patientId), JSON.stringify(body));
  const suspendedRow = body.suspended.find((row) => row.patient.patient_id === flaggedPatientId)!;
  assert.ok(suspendedRow.record?.flagging_reason, "expected the suspending record");
});

test("suspend consumes the pending flag and records the review, audited", async () => {
  const recordId = await seedFlag(flaggedPatientId, SuspensionTrigger.staff);

  const result = await suspend(flaggedPatientId, adminCookie, {
    reason: "Repeat Booking Abuse",
    admin_notes: "Three flags in a month",
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));

  const stored = await prisma.patient.findUniqueOrThrow({ where: { patient_id: flaggedPatientId } });
  assert.equal(stored.account_status, "suspended");
  assert.equal(stored.suspension_reason, "Repeat Booking Abuse");

  const record = await prisma.suspensionRecord.findUniqueOrThrow({ where: { suspension_id: recordId } });
  assert.equal(record.outcome, "suspended");
  assert.equal(record.reviewed_by_staff_id, adminId);
  assert.ok(record.reviewed_at);
  assert.equal(record.admin_notes, "Three flags in a month");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/accounts/${flaggedPatientId}/suspend` },
  });
  assert.ok(audit, "expected a suspend audit row");
});

test("reinstate returns a suspended account to active and audited outcome", async () => {
  const recordId = await seedFlag(flaggedPatientId, SuspensionTrigger.system);
  await suspend(flaggedPatientId, adminCookie, { reason: "Breach of BR-02" });

  const result = await reinstate(flaggedPatientId, adminCookie, { admin_notes: "Cleared on appeal" });
  assert.equal(result.status, 200, JSON.stringify(result.body));

  const stored = await prisma.patient.findUniqueOrThrow({ where: { patient_id: flaggedPatientId } });
  assert.equal(stored.account_status, "active");

  const record = await prisma.suspensionRecord.findUniqueOrThrow({ where: { suspension_id: recordId } });
  assert.equal(record.outcome, "reinstated");
  assert.ok(record.reviewed_at);
  assert.equal(record.admin_notes, "Cleared on appeal");

  const audit = await prisma.auditLog.findFirst({
    where: { resource: `/accounts/${flaggedPatientId}/reinstate` },
  });
  assert.ok(audit, "expected a reinstate audit row");
});

test("a dental assistant cannot suspend or reinstate (OQ-21: admin only)", async () => {
  await seedFlag(flaggedPatientId, SuspensionTrigger.staff);

  const suspendResult = await suspend(flaggedPatientId, assistantCookie, { reason: "attempt" });
  assert.equal(suspendResult.status, 403, JSON.stringify(suspendResult.body));

  const reinstateResult = await reinstate(flaggedPatientId, assistantCookie, {});
  assert.equal(reinstateResult.status, 403, JSON.stringify(reinstateResult.body));
});


test("a suspended patient cannot log in and existing sessions are blocked (FR-MOD-06)", async () => {
  // Obtain a session while the account is still active.
  const activeLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email("flagged"), password }),
  });
  const activeCookie = cookieFrom(activeLogin);

  await seedFlag(flaggedPatientId, SuspensionTrigger.system);
  await suspend(flaggedPatientId, adminCookie, { reason: "Active suspension" });

  // A fresh login attempt is refused once the account is suspended.
  const suspendedLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email("flagged"), password }),
  });
  assert.equal(suspendedLogin.status, 401);

  // A session created before the suspension is blocked by the middleware.
  const booking = await request("/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: activeCookie },
    body: JSON.stringify({
      appointment_type_id: appointmentTypeId,
      doctor_staff_id: doctorId,
      scheduled_datetime: TARGET_SLOT,
    }),
  });
  assert.equal(booking.status, 403, JSON.stringify(await booking.json()));
});
test("suspend on a clean (no pending flag) account is refused", async () => {
  const result = await suspend(patientId, adminCookie, { reason: "Not warranted" });
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.equal(result.body.error, "No pending flag to review");
});

test("suspend on an already-suspended account is refused", async () => {
  await seedFlag(flaggedPatientId, SuspensionTrigger.system);
  await suspend(flaggedPatientId, adminCookie, { reason: "First suspension" });

  const second = await suspend(flaggedPatientId, adminCookie, { reason: "Second suspension" });
  assert.equal(second.status, 409, JSON.stringify(second.body));
  assert.equal(second.body.error, "Account is already suspended");
});

test("reinstate without an active suspension is refused (no record / double reinstate)", async () => {
  const first = await reinstate(patientId, adminCookie, {});
  assert.equal(first.status, 409, JSON.stringify(first.body));
  assert.equal(first.body.error, "Account has no active suspension to review");

  await seedFlag(flaggedPatientId, SuspensionTrigger.system);
  await suspend(flaggedPatientId, adminCookie, { reason: "Temporary" });
  await reinstate(flaggedPatientId, adminCookie, {});
  const second = await reinstate(flaggedPatientId, adminCookie, {});
  assert.equal(second.status, 409, JSON.stringify(second.body));
});

