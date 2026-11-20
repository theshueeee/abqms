import { Response, Router } from "express";
import { Prisma, StaffRole } from "@prisma/client";
import { z } from "zod";
import { recordAudit } from "../audit";
import { prisma } from "../db";
import { AuthenticatedRequest, requireAuth } from "../auth/middleware";

const blockSchema = z.object({
  doctor_staff_id: z.string().uuid(),
  start_datetime: z.coerce.date(),
  end_datetime: z.coerce.date(),
  block_reason: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

const releaseSchema = z.object({ confirm: z.literal(true) });

function parse<T>(schema: z.ZodType<T>, value: unknown, response: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    response.status(400).json({ error: "Invalid request", details: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function dayKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

async function lockDoctorDays(
  transaction: Prisma.TransactionClient,
  doctorId: string,
  start: Date,
  end: Date,
): Promise<void> {
  for (const day of dayKeys(start, end)) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${doctorId}:${day}`}))`;
  }
}

export function createTimeblocksRouter(): Router {
  const router = Router();

  router.get("/", requireAuth(), async (request: AuthenticatedRequest, response) => {
    const doctorId = request.query.doctor_staff_id;
    if (doctorId !== undefined && (typeof doctorId !== "string" || !z.string().uuid().safeParse(doctorId).success)) {
      response.status(400).json({ error: "Invalid doctor_staff_id" });
      return;
    }
    try {
      const blocks = await prisma.timeBlock.findMany({
        where: { doctor_staff_id: doctorId as string | undefined, deleted_at: null },
        orderBy: { start_datetime: "asc" },
      });
      response.json({ timeblocks: blocks });
    } catch (error) {
      console.error("Time-block listing failed", error);
      response.status(500).json({ error: "Unable to list time blocks" });
    }
  });

  router.post("/", requireAuth([StaffRole.dental_assistant, StaffRole.admin]), async (
    request: AuthenticatedRequest,
    response,
  ) => {
    const input = parse(blockSchema, request.body, response);
    if (!input) return;
    if (input.start_datetime >= input.end_datetime) {
      response.status(400).json({ error: "start_datetime must be before end_datetime" });
      return;
    }
    try {
      const block = await prisma.$transaction(async (transaction) => {
        await lockDoctorDays(transaction, input.doctor_staff_id, input.start_datetime, input.end_datetime);
        const doctor = await transaction.staff.findUnique({
          where: { staff_id: input.doctor_staff_id },
          select: { staff_id: true },
        });
        if (!doctor) return null;
        const overlap = await transaction.timeBlock.findFirst({
          where: {
            doctor_staff_id: input.doctor_staff_id,
            deleted_at: null,
            start_datetime: { lt: input.end_datetime },
            end_datetime: { gt: input.start_datetime },
          },
        });
        if (overlap) return undefined;
        return transaction.timeBlock.create({
          data: { ...input, blocked_by_staff_id: request.auth!.staffId! },
        });
      });
      if (block === null) {
        response.status(404).json({ error: "Doctor not found" });
        return;
      }
      if (block === undefined) {
        response.status(409).json({ error: "Time block overlaps an existing block" });
        return;
      }
      await recordAudit(request.auth!.staffId!, "POST", "/timeblocks", { block_id: block.block_id });
      response.status(201).json({ timeblock: block });
    } catch (error) {
      console.error("Time-block creation failed", error);
      response.status(500).json({ error: "Unable to create time block" });
    }
  });

  router.delete("/:id", requireAuth([StaffRole.dental_assistant, StaffRole.admin]), async (
    request: AuthenticatedRequest,
    response,
  ) => {
    const input = parse(releaseSchema, request.body, response);
    if (!input) return;
    const blockId = request.params.id;
    if (typeof blockId !== "string" || !z.string().uuid().safeParse(blockId).success) {
      response.status(404).json({ error: "Time block not found" });
      return;
    }
    try {
      const released = await prisma.timeBlock.updateMany({
        where: { block_id: blockId, deleted_at: null },
        data: { deleted_at: new Date() },
      });
      if (released.count === 0) {
        response.status(404).json({ error: "Time block not found" });
        return;
      }
      await recordAudit(request.auth!.staffId!, "DELETE", `/timeblocks/${blockId}`, {
        block_id: blockId,
      });
      response.status(204).send();
    } catch (error) {
      console.error("Time-block release failed", error);
      response.status(500).json({ error: "Unable to release time block" });
    }
  });

  return router;
}
