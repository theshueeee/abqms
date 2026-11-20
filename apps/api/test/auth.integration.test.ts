import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { AccountStatus, StaffRole } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/db";
import { createToken, hashPassword, hashToken } from "../src/auth/security";

const marker = `auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = "correct horse battery staple";
let server: Server;
let baseUrl: string;

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

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

before(async () => {
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  const patients = await prisma.patient.findMany({
    where: { email: { startsWith: marker } },
    select: { patient_id: true },
  });
  const staff = await prisma.staff.findMany({
    where: { email: { startsWith: marker } },
    select: { staff_id: true },
  });
  const patientIds = patients.map(({ patient_id }) => patient_id);
  const staffIds = staff.map(({ staff_id }) => staff_id);

  await prisma.session.deleteMany({
    where: { OR: [{ patient_id: { in: patientIds } }, { staff_id: { in: staffIds } }] },
  });
  await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ patient_id: { in: patientIds } }, { staff_id: { in: staffIds } }] },
  });
  await prisma.loginAttempt.deleteMany({ where: { attempt_key: { contains: marker } } });
  await prisma.staff.deleteMany({ where: { provisioned_by: { in: staffIds } } });
  await prisma.staff.deleteMany({ where: { staff_id: { in: staffIds } } });
  await prisma.patient.deleteMany({ where: { patient_id: { in: patientIds } } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("patient signup, logout, and login create a server-resolved session", async () => {
  const patientEmail = email("patient");
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Integration Patient",
      email: patientEmail,
      phone_number: "0123456789",
      date_of_birth: "1998-01-01",
      password,
    }),
  });
  assert.equal(signup.status, 201);
  assert.equal((await json(signup)).user !== undefined, true);
  const signupCookie = cookieFrom(signup);

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: { cookie: signupCookie },
  });
  assert.equal(logout.status, 204);

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert.equal(login.status, 200);
  assert.equal((await json(login)).user !== undefined, true);
  assert.match(cookieFrom(login), /^dq_session=.+/);
});

test("password reset consumes a token and invalidates the old password", async () => {
  const patientEmail = email("reset");
  const patient = await prisma.patient.create({
    data: {
      full_name: "Reset Patient",
      email: patientEmail,
      phone_number: "0123456789",
      date_of_birth: new Date("1998-01-01"),
      password_hash: await hashPassword(password),
    },
  });
  const rawToken = createToken();
  await prisma.passwordResetToken.create({
    data: {
      token_hash: hashToken(rawToken),
      patient_id: patient.patient_id,
      expires_at: new Date(Date.now() + 60_000),
    },
  });

  const reset = await request("/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken, password: "new correct password" }),
  });
  assert.equal(reset.status, 204);

  const oldLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail, password: "new correct password" }),
  });
  assert.equal(newLogin.status, 200);

  const reused = await request("/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken, password }),
  });
  assert.equal(reused.status, 400);
});

test("forgot-password is non-disclosing and suspended patients cannot log in", async () => {
  const patientEmail = email("suspended");
  await prisma.patient.create({
    data: {
      full_name: "Suspended Patient",
      email: patientEmail,
      phone_number: "0123456789",
      date_of_birth: new Date("1998-01-01"),
      password_hash: await hashPassword(password),
      account_status: AccountStatus.suspended,
    },
  });

  const existing = await request("/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail }),
  });
  const missing = await request("/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email("missing") }),
  });
  assert.equal(existing.status, 202);
  assert.equal(missing.status, 202);
  assert.deepEqual(await json(existing), await json(missing));

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert.equal(login.status, 401);
});

test("repeated invalid logins are blocked after five failures", async () => {
  const patientEmail = email("locked");
  await prisma.patient.create({
    data: {
      full_name: "Locked Patient",
      email: patientEmail,
      phone_number: "0123456789",
      date_of_birth: new Date("1998-01-01"),
      password_hash: await hashPassword(password),
    },
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password: "wrong password" }),
    });
    assert.equal(response.status, 401);
  }
  const blocked = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert.equal(blocked.status, 429);
});

test("admin provisioning enforces roles and inactive staff cannot log in", async () => {
  const adminEmail = email("admin");
  const assistantEmail = email("assistant");
  const inactiveEmail = email("inactive");
  const admin = await prisma.staff.create({
    data: {
      full_name: "Integration Admin",
      email: adminEmail,
      phone_number: "0123456789",
      role: StaffRole.admin,
      password_hash: await hashPassword(password),
    },
  });
  await prisma.staff.create({
    data: {
      full_name: "Inactive Staff",
      email: inactiveEmail,
      phone_number: "0123456789",
      role: StaffRole.dental_assistant,
      password_hash: await hashPassword(password),
      is_active: false,
    },
  });

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password }),
  });
  const adminCookie = cookieFrom(adminLogin);
  assert.equal(adminLogin.status, 200);

  const provision = await request("/api/auth/staff/create", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      full_name: "Integration Assistant",
      email: assistantEmail,
      phone_number: "0123456789",
      role: "dental_assistant",
      password,
    }),
  });
  assert.equal(provision.status, 201);

  const duplicate = await request("/api/auth/staff/create", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      full_name: "Duplicate Assistant",
      email: assistantEmail,
      phone_number: "0123456789",
      role: "dental_assistant",
      password,
    }),
  });
  assert.equal(duplicate.status, 409);

  const invalidRole = await request("/api/auth/staff/create", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      full_name: "Invalid Role",
      email: email("doctor"),
      phone_number: "0123456789",
      role: "doctor",
      password,
    }),
  });
  assert.equal(invalidRole.status, 400);

  const assistantLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: assistantEmail, password }),
  });
  const assistantCookie = cookieFrom(assistantLogin);
  const refused = await request("/api/auth/staff/create", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: assistantCookie },
    body: JSON.stringify({
      full_name: "Refused Staff",
      email: email("refused"),
      phone_number: "0123456789",
      role: "dental_assistant",
      password,
    }),
  });
  assert.equal(refused.status, 403);

  const unauthenticated = await request("/api/auth/staff/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Unauthenticated Staff",
      email: email("unauthenticated"),
      phone_number: "0123456789",
      role: "dental_assistant",
      password,
    }),
  });
  assert.equal(unauthenticated.status, 401);

  const unauthenticatedLogout = await request("/api/auth/logout", { method: "POST" });
  assert.equal(unauthenticatedLogout.status, 401);

  const inactiveLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: inactiveEmail, password }),
  });
  assert.equal(inactiveLogin.status, 401);
});
