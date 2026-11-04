import { Request, Response, Router } from "express";
import { StaffRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../config";
import { deliverPasswordResetToken } from "./delivery";
import { AuthenticatedRequest, requireAuth } from "./middleware";
import { createToken, hashPassword, hashToken, MIN_PASSWORD_LENGTH, verifyPassword } from "./security";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const signupSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(1),
  phone_number: z.string().trim().min(1),
  date_of_birth: z.coerce.date(),
});

const staffSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(1),
  phone_number: z.string().trim().min(1),
  role: z.nativeEnum(StaffRole),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const maxFailures = 5;
const blockDurationMs = 15 * 60 * 1000;

function setSessionCookie(response: Response, token: string): void {
  const secure = config.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `dq_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${config.SESSION_TTL_HOURS * 3600}${secure}`);
}

function parse<T>(schema: z.ZodType<T>, value: unknown, response: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    response.status(400).json({ error: "Invalid request", details: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

async function createSession(response: Response, actorType: "patient" | "staff", id: string): Promise<void> {
  const token = createToken();
  await prisma.session.create({
    data: {
      token_hash: hashToken(token),
      actor_type: actorType,
      patient_id: actorType === "patient" ? id : undefined,
      staff_id: actorType === "staff" ? id : undefined,
      expires_at: new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  setSessionCookie(response, token);
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/signup", async (request, response) => {
    const input = parse(signupSchema, request.body, response);
    if (!input) return;
    const { password, ...patientInput } = input;
    const existing = await prisma.patient.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      response.status(409).json({ error: "Email is already registered" });
      return;
    }
    const patient = await prisma.patient.create({
      data: { ...patientInput, email: input.email.toLowerCase(), password_hash: await hashPassword(password) },
    });
    await createSession(response, "patient", patient.patient_id);
    response.status(201).json({ user: { id: patient.patient_id, role: "patient" } });
  });

  router.post("/login", async (request, response) => {
    const input = parse(credentialsSchema, request.body, response);
    if (!input) return;
    const key = `${request.ip}:${input.email.toLowerCase()}`;
    const now = new Date();
    const attempt = await prisma.loginAttempt.findUnique({ where: { attempt_key: key } });
    if (attempt?.blocked_until && attempt.blocked_until > now) {
      response.status(429).json({ error: "Too many login attempts" });
      return;
    }
    const patient = await prisma.patient.findUnique({ where: { email: input.email.toLowerCase() } });
    const staff = patient ? null : await prisma.staff.findUnique({ where: { email: input.email.toLowerCase() } });
    const valid = patient
      ? patient.account_status !== "suspended" && await verifyPassword(patient.password_hash, input.password)
      : staff
        ? staff.is_active && await verifyPassword(staff.password_hash, input.password)
        : false;
    if (!valid) {
      const failures = (attempt?.failures ?? 0) + 1;
      await prisma.loginAttempt.upsert({
        where: { attempt_key: key },
        create: {
          attempt_key: key,
          failures,
          blocked_until: failures >= maxFailures ? new Date(Date.now() + blockDurationMs) : null,
        },
        update: {
          failures,
          blocked_until: failures >= maxFailures ? new Date(Date.now() + blockDurationMs) : null,
        },
      });
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (attempt) {
      await prisma.loginAttempt.delete({ where: { attempt_key: key } });
    }
    await createSession(response, patient ? "patient" : "staff", patient?.patient_id ?? staff!.staff_id);
    response.json({ user: { id: patient?.patient_id ?? staff!.staff_id, role: patient ? "patient" : staff!.role } });
  });

  router.post("/logout", requireAuth(), async (request: Request, response) => {
    const token = request.header("cookie")?.match(/(?:^|;\s*)dq_session=([^;]+)/)?.[1];
    if (token) await prisma.session.updateMany({ where: { token_hash: hashToken(token), revoked_at: null }, data: { revoked_at: new Date() } });
    response.setHeader("Set-Cookie", "dq_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    response.status(204).send();
  });

  router.post("/staff/create", requireAuth([StaffRole.admin]), async (request: AuthenticatedRequest, response) => {
    const input = parse(staffSchema, request.body, response);
    if (!input) return;
    const { password, ...staffInput } = input;
    const existing = await prisma.staff.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      response.status(409).json({ error: "Email is already registered" });
      return;
    }
    const staff = await prisma.staff.create({
      data: {
        ...staffInput,
        email: input.email.toLowerCase(),
        password_hash: await hashPassword(password),
        provisioned_by: request.auth!.staffId,
      },
    });
    response.status(201).json({ staff: { id: staff.staff_id, role: staff.role } });
  });

  router.post("/forgot-password", async (request, response) => {
    const input = parse(z.object({ email: z.string().email() }), request.body, response);
    if (!input) return;
    const email = input.email.toLowerCase();
    const patient = await prisma.patient.findUnique({ where: { email } });
    const staff = patient ? null : await prisma.staff.findUnique({ where: { email } });
    if (patient || staff) {
      const rawToken = createToken();
      await prisma.passwordResetToken.create({
        data: {
          token_hash: hashToken(rawToken),
          patient_id: patient?.patient_id,
          staff_id: staff?.staff_id,
          expires_at: new Date(Date.now() + config.RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        },
      });
      await deliverPasswordResetToken({ email, token: rawToken });
    }
    response.status(202).json({ message: "If the account exists, reset instructions have been sent" });
  });

  router.post("/reset-password", async (request, response) => {
    const input = parse(resetSchema, request.body, response);
    if (!input) return;
    const reset = await prisma.passwordResetToken.findUnique({ where: { token_hash: hashToken(input.token) } });
    if (!reset || reset.consumed_at || reset.expires_at <= new Date()) {
      response.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const password_hash = await hashPassword(input.password);
    await prisma.$transaction([
      reset.patient_id
        ? prisma.patient.update({ where: { patient_id: reset.patient_id }, data: { password_hash } })
        : prisma.staff.update({ where: { staff_id: reset.staff_id! }, data: { password_hash } }),
      prisma.passwordResetToken.update({ where: { token_id: reset.token_id }, data: { consumed_at: new Date() } }),
    ]);
    response.status(204).send();
  });

  return router;
}
