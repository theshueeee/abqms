import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { StaffRole } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { hashPassword } from "../src/auth/security";

const marker = `timeblock-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "correct horse battery staple";
let server: Server;
let baseUrl: string;
let doctorId: string;
let staffCookie: string;
let patientCookie: string;

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
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;

  const doctor = await prisma.staff.create({
    data: {
      full_name: "Time Block Assistant",
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
      full_name: "Time Block Patient",
      email: email("patient"),
      phone_number: "0123456789",
      date_of_birth: "1998-01-01",
      password,
    }),
  });
  patientCookie = cookieFrom(patientSignup);
});

after(async () => {
  await prisma.timeBlock.deleteMany({ where: { doctor_staff_id: doctorId } });
  await prisma.auditLog.deleteMany({ where: { resource: { contains: "/timeblocks" } } });
  const staff = await prisma.staff.findMany({ where: { email: { startsWith: marker } }, select: { staff_id: true } });
  const patients = await prisma.patient.findMany({ where: { email: { startsWith: marker } }, select: { patient_id: true } });
  await prisma.session.deleteMany({
    where: { OR: [{ staff_id: { in: staff.map(({ staff_id }) => staff_id) } }, { patient_id: { in: patients.map(({ patient_id }) => patient_id) } }] },
  });
  await prisma.staff.deleteMany({ where: { staff_id: { in: staff.map(({ staff_id }) => staff_id) } } });
  await prisma.patient.deleteMany({ where: { patient_id: { in: patients.map(({ patient_id }) => patient_id) } } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("staff can create, list, and release time blocks with half-open overlap rules", async () => {
  const create = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-01-10T09:00:00.000Z",
      end_datetime: "2030-01-10T12:00:00.000Z",
      block_reason: "Annual leave",
    }),
  });
  assert.equal(create.status, 201);
  const block = (await create.json() as { timeblock: { block_id: string } }).timeblock;

  const touching = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-01-10T12:00:00.000Z",
      end_datetime: "2030-01-10T13:00:00.000Z",
      block_reason: "Academic duty",
    }),
  });
  assert.equal(touching.status, 201);

  const overlapping = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-01-10T11:00:00.000Z",
      end_datetime: "2030-01-10T13:00:00.000Z",
      block_reason: "Conflicting duty",
    }),
  });
  assert.equal(overlapping.status, 409);

  const release = await request(`/api/timeblocks/${block.block_id}`, {
    method: "DELETE",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({ confirm: true }),
  });
  assert.equal(release.status, 204);

  const repeatedRelease = await request(`/api/timeblocks/${block.block_id}`, {
    method: "DELETE",
    headers: { "content-type": "application/json", cookie: staffCookie },
    body: JSON.stringify({ confirm: true }),
  });
  assert.equal(repeatedRelease.status, 404);

  const audit = await prisma.auditLog.findMany({ where: { resource: `/timeblocks/${block.block_id}` } });
  assert.equal(audit.length, 1);
});

test("patients can read active blocks but cannot create or release them", async () => {
  const list = await request(`/api/timeblocks?doctor_staff_id=${doctorId}`, { headers: { cookie: patientCookie } });
  assert.equal(list.status, 200);

  const create = await request("/api/timeblocks", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: patientCookie },
    body: JSON.stringify({
      doctor_staff_id: doctorId,
      start_datetime: "2030-02-10T09:00:00.000Z",
      end_datetime: "2030-02-10T10:00:00.000Z",
      block_reason: "Unauthorized",
    }),
  });
  assert.equal(create.status, 403);
});
