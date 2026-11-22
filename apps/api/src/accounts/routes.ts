import { Response, Router } from "express";
import { StaffRole, SuspensionOutcome } from "@prisma/client";
import { z } from "zod";
import { recordAudit } from "../audit";
import { AuthenticatedRequest, requireAuth } from "../auth/middleware";
import { prisma } from "../db";
import { mapStatusFromOutcome } from "../moderation/mapping";

// OQ-21 decided for F-12: suspension/reinstatement is a privileged compliance
// decision and is admin-only (BR-07). The review queue itself stays readable
// by any staff member so assistants can surface flagged accounts to an admin.
const QUEUE_ROLES = [StaffRole.admin, StaffRole.dental_assistant];
const REVIEW_ROLES = [StaffRole.admin];

const suspendSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  admin_notes: z.string().trim().max(2000).optional(),
});

const reinstateSchema = z.object({
  admin_notes: z.string().trim().max(2000).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown, response: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    response.status(400).json({ error: "Invalid request", details: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function parsePatientId(request: AuthenticatedRequest, response: Response): string | undefined {
  const patientId = typeof request.params.id === "string" ? request.params.id : "";
  if (!z.string().uuid().safeParse(patientId).success) {
    response.status(400).json({ error: "Invalid patient id" });
    return undefined;
  }
  return patientId;
}

type PendingRecord = {
  suspension_id: string;
  flagging_reason: string;
  triggered_by: "system" | "staff";
  flagged_at: Date;
};

async function latestPendingRecord(patientId: string): Promise<PendingRecord | null> {
  return prisma.suspensionRecord.findFirst({
    where: { patient_id: patientId, outcome: SuspensionOutcome.pending },
    orderBy: { flagged_at: "desc" },
    select: {
      suspension_id: true,
      flagging_reason: true,
      triggered_by: true,
      flagged_at: true,
    },
  });
}
export function createAccountsRouter(): Router {
  const router = Router();

  // FR-MOD-02: the queue lists patients with at least one unreviewed flag.
  router.get("/flagged", requireAuth(QUEUE_ROLES), async (_request, response) => {
    try {
      const rows = await prisma.patient.findMany({
        where: { suspension_records: { some: { outcome: SuspensionOutcome.pending } } },
        select: {
          patient_id: true,
          full_name: true,
          email: true,
          phone_number: true,
          account_status: true,
          suspension_reason: true,
          suspension_records: {
            where: { outcome: SuspensionOutcome.pending },
            orderBy: { flagged_at: "desc" },
            take: 1,
            select: {
              suspension_id: true,
              flagging_reason: true,
              triggered_by: true,
              flagged_at: true,
              admin_notes: true,
            },
          },
        },
        orderBy: { updated_at: "desc" },
      });
      const flagged = rows.map((row) => {
        const { suspension_records, ...patient } = row;
        return { patient, flag: suspension_records[0] ?? null };
      });
      response.json({ flagged });
    } catch (error) {
      console.error("Flagged-account listing failed", error);
      response.status(500).json({ error: "Unable to list flagged accounts" });
    }
  });

  // FR-MOD-04 support: lists patients under an active suspension so an admin
  // can review and reinstate them. Readable by staff; actions stay admin-only.
  router.get("/suspended", requireAuth(QUEUE_ROLES), async (_request, response) => {
    try {
      const rows = await prisma.patient.findMany({
        where: { account_status: "suspended" },
        select: {
          patient_id: true,
          full_name: true,
          email: true,
          phone_number: true,
          account_status: true,
          suspension_reason: true,
          suspension_records: {
            where: { outcome: SuspensionOutcome.suspended },
            orderBy: { reviewed_at: "desc" },
            take: 1,
            select: {
              suspension_id: true,
              flagging_reason: true,
              triggered_by: true,
              flagged_at: true,
              reviewed_at: true,
              admin_notes: true,
            },
          },
        },
        orderBy: { updated_at: "desc" },
      });
      const suspended = rows.map((row) => {
        const { suspension_records, ...patient } = row;
        return { patient, record: suspension_records[0] ?? null };
      });
      response.json({ suspended });
    } catch (error) {
      console.error("Suspended-account listing failed", error);
      response.status(500).json({ error: "Unable to list suspended accounts" });
    }
  });

  // FR-MOD-03 + FR-MOD-05: suspending consumes the pending flag and records
  // the reviewer, timestamp, reason and optional notes, audited (BR-06).
  router.patch("/:id/suspend", requireAuth(REVIEW_ROLES), async (request: AuthenticatedRequest, response) => {
    const patientId = parsePatientId(request, response);
    if (!patientId) return;
    const input = parse(suspendSchema, request.body, response);
    if (!input) return;

    try {
      const patient = await prisma.patient.findUnique({ where: { patient_id: patientId } });
      if (!patient) {
        response.status(404).json({ error: "Patient not found" });
        return;
      }

      const record = await latestPendingRecord(patientId);
      if (!record) {
        response.status(409).json({
          error:
            patient.account_status === "suspended"
              ? "Account is already suspended"
              : "No pending flag to review",
        });
        return;
      }

      const reviewedAt = new Date();
      const [suspension] = await prisma.$transaction([
        prisma.suspensionRecord.update({
          where: { suspension_id: record.suspension_id },
          data: {
            outcome: SuspensionOutcome.suspended,
            reviewed_by_staff_id: request.auth!.staffId!,
            reviewed_at: reviewedAt,
            admin_notes: input.admin_notes,
          },
        }),
        prisma.patient.update({
          where: { patient_id: patientId },
          data: {
            account_status: mapStatusFromOutcome(SuspensionOutcome.suspended),
            suspension_reason: input.reason,
          },
        }),
      ]);

      await recordAudit(
        request.auth!.staffId!,
        "PATCH",
        `/accounts/${patientId}/suspend`,
        { patient_id: patientId, suspension_id: suspension.suspension_id, outcome: "suspended" },
      );
      response.json({ suspension, patient_id: patientId });
    } catch (error) {
      console.error("Account suspension failed", error);
      response.status(500).json({ error: "Unable to suspend account" });
    }
  });
// FR-MOD-04 + FR-MOD-05: reinstatement returns the account to active and
  // records the same review fields (audited by BR-06).
  router.patch("/:id/reinstate", requireAuth(REVIEW_ROLES), async (request: AuthenticatedRequest, response) => {
    const patientId = parsePatientId(request, response);
    if (!patientId) return;
    const input = parse(reinstateSchema, request.body, response);
    if (!input) return;

    try {
      const patient = await prisma.patient.findUnique({ where: { patient_id: patientId } });
      if (!patient) {
        response.status(404).json({ error: "Patient not found" });
        return;
      }

      const record = await prisma.suspensionRecord.findFirst({
        where: { patient_id: patientId, outcome: SuspensionOutcome.suspended },
        orderBy: { reviewed_at: "desc" },
        select: { suspension_id: true, reviewed_by_staff_id: true, reviewed_at: true },
      });
      if (!record) {
        response.status(409).json({ error: "Account has no active suspension to review" });
        return;
      }

      const reviewedAt = new Date();
      const [suspension] = await prisma.$transaction([
        prisma.suspensionRecord.update({
          where: { suspension_id: record.suspension_id },
          data: {
            outcome: SuspensionOutcome.reinstated,
            reviewed_by_staff_id: record.reviewed_by_staff_id ?? request.auth!.staffId!,
            reviewed_at: reviewedAt,
            admin_notes: input.admin_notes,
          },
        }),
        prisma.patient.update({
          where: { patient_id: patientId },
          data: { account_status: mapStatusFromOutcome(SuspensionOutcome.reinstated) },
        }),
      ]);

      await recordAudit(
        request.auth!.staffId!,
        "PATCH",
        `/accounts/${patientId}/reinstate`,
        { patient_id: patientId, suspension_id: suspension.suspension_id, outcome: "reinstated" },
      );
      response.json({ suspension, patient_id: patientId });
    } catch (error) {
      console.error("Account reinstatement failed", error);
      response.status(500).json({ error: "Unable to reinstate account" });
    }
  });

  return router;
}