import { Response, Router } from "express";
import { AppointmentStatus, Prisma, StaffRole } from "@prisma/client";
import { z } from "zod";
import { recordAudit } from "../audit";
import { AuthenticatedRequest, requireAuth } from "../auth/middleware";
import { prisma } from "../db";

const PM_START_MINUTES = 12 * 60;
const PM_END_MINUTES = 17 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const TIME_ZONE = "Asia/Kuala_Lumpur";

const bookingSchema = z.object({
  appointment_type_id: z.string().uuid(),
  doctor_staff_id: z.string().uuid(),
  scheduled_datetime: z.coerce.date(),
  patient_id: z.string().uuid().optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown, response: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    response.status(400).json({ error: "Invalid request", details: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function localDateParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function utcFromLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
}

function startOfLocalDay(date: Date): Date {
  const local = localDateParts(date);
  return utcFromLocalDate(local.year, local.month, local.day, 0, 0);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function clinicNow(): Date {
  const mockNow = process.env.CLINIC_MOCK_NOW;
  return mockNow ? new Date(mockNow) : new Date();
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

async function lockDoctorDay(
  transaction: Prisma.TransactionClient,
  doctorId: string,
  date: Date,
): Promise<void> {
  const local = localDateParts(date);
  const key = `${doctorId}:${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

export function createAppointmentsRouter(): Router {
  const router = Router();

  router.get("/availability", requireAuth(), async (request: AuthenticatedRequest, response) => {
    const date = typeof request.query.date === "string" ? request.query.date : undefined;
    const doctorId = typeof request.query.doctor_staff_id === "string"
      ? request.query.doctor_staff_id
      : undefined;
    const appointmentTypeId = typeof request.query.appointment_type_id === "string"
      ? request.query.appointment_type_id
      : undefined;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !doctorId || !appointmentTypeId) {
      response.status(400).json({ error: "date, doctor_staff_id, and appointment_type_id are required" });
      return;
    }
    if (!z.string().uuid().safeParse(doctorId).success ||
        !z.string().uuid().safeParse(appointmentTypeId).success) {
      response.status(400).json({ error: "Invalid doctor or appointment type" });
      return;
    }

    try {
      const [year, month, day] = date.split("-").map(Number);
      const doctor = await prisma.staff.findUnique({ where: { staff_id: doctorId }, select: { staff_id: true } });
      const appointmentType = await prisma.appointmentType.findFirst({
        where: { appointment_type_id: appointmentTypeId, is_active: true },
      });
      if (!doctor || !appointmentType) {
        response.status(404).json({ error: "Doctor or appointment type not found" });
        return;
      }

      const dayStart = utcFromLocalDate(year, month, day, 0, 0);
      const dayEnd = addMinutes(dayStart, 24 * 60);
      const [blocks, appointments] = await Promise.all([
        prisma.timeBlock.findMany({
          where: {
            doctor_staff_id: doctorId,
            deleted_at: null,
            start_datetime: { lt: dayEnd },
            end_datetime: { gt: dayStart },
          },
        }),
        prisma.appointment.findMany({
          where: {
            doctor_staff_id: doctorId,
            scheduled_datetime: { gte: dayStart, lt: dayEnd },
            status: { in: [
              AppointmentStatus.pending,
              AppointmentStatus.confirmed,
              AppointmentStatus.checked_in,
            ] },
          },
          include: { appointment_type: true },
        }),
      ]);

      const slots: Array<{ scheduled_datetime: string }> = [];
      for (
        let startMinutes = PM_START_MINUTES;
        startMinutes + appointmentType.default_duration_minutes <= PM_END_MINUTES;
        startMinutes += SLOT_INTERVAL_MINUTES
      ) {
        const hour = Math.floor(startMinutes / 60);
        const minute = startMinutes % 60;
        const slotStart = utcFromLocalDate(year, month, day, hour, minute);
        const slotEnd = addMinutes(slotStart, appointmentType.default_duration_minutes);
        const blocked = blocks.some((block) => overlaps(slotStart, slotEnd, block.start_datetime, block.end_datetime));
        const occupied = appointments.some((appointment) => {
          const appointmentEnd = addMinutes(
            appointment.scheduled_datetime,
            appointment.appointment_type.default_duration_minutes,
          );
          return overlaps(slotStart, slotEnd, appointment.scheduled_datetime, appointmentEnd);
        });
        if (!blocked && !occupied) {
          slots.push({ scheduled_datetime: slotStart.toISOString() });
        }
      }
      response.json({ slots });
    } catch (error) {
      console.error("Availability query failed", error);
      response.status(500).json({ error: "Unable to query availability" });
    }
  });

  router.get("/", requireAuth(), async (request: AuthenticatedRequest, response) => {
    const date = typeof request.query.date === "string" ? request.query.date : undefined;
    const doctorId = typeof request.query.doctor_staff_id === "string"
      ? request.query.doctor_staff_id
      : undefined;
    try {
      let where: Prisma.AppointmentWhereInput = {};
      if (request.auth!.actorType === "patient") {
        where.patient_id = request.auth!.patientId!;
      } else {
        if (date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            response.status(400).json({ error: "Invalid date" });
            return;
          }
          const [year, month, day] = date.split("-").map(Number);
          where.scheduled_datetime = {
            gte: utcFromLocalDate(year, month, day, 0, 0),
            lt: addMinutes(utcFromLocalDate(year, month, day, 0, 0), 24 * 60),
          };
        }
        if (doctorId) {
          if (!z.string().uuid().safeParse(doctorId).success) {
            response.status(400).json({ error: "Invalid doctor_staff_id" });
            return;
          }
          where.doctor_staff_id = doctorId;
        }
      }
      const appointments = await prisma.appointment.findMany({
        where,
        include: { appointment_type: true, doctor: true, patient: true },
        orderBy: { scheduled_datetime: "asc" },
      });
      response.json({ appointments });
    } catch (error) {
      console.error("Appointment listing failed", error);
      response.status(500).json({ error: "Unable to list appointments" });
    }
  });

  router.post("/", requireAuth(), async (request: AuthenticatedRequest, response) => {
    const input = parse(bookingSchema, request.body, response);
    if (!input) return;

    let patientId = request.auth!.patientId;
    if (request.auth!.actorType === "staff") {
      patientId = input.patient_id;
      if (!patientId) {
        response.status(400).json({ error: "patient_id is required for staff bookings" });
        return;
      }
    } else if (input.patient_id && input.patient_id !== patientId) {
      response.status(403).json({ error: "Cannot book for another patient" });
      return;
    }
    if (!patientId) {
      response.status(403).json({ error: "Patient actor required" });
      return;
    }

    const nowLocal = localDateParts(clinicNow());
    const nowMinutes = nowLocal.hour * 60 + nowLocal.minute;
    if (nowMinutes < PM_START_MINUTES || nowMinutes >= PM_END_MINUTES) {
      response.status(409).json({ error: "Online booking is available only during PM mode" });
      return;
    }

    const scheduledLocal = localDateParts(input.scheduled_datetime);
    const scheduledMinutes = scheduledLocal.hour * 60 + scheduledLocal.minute;
    if (scheduledMinutes < PM_START_MINUTES || scheduledMinutes >= PM_END_MINUTES) {
      response.status(409).json({ error: "Scheduled time must be within PM hours" });
      return;
    }
    if (scheduledMinutes % SLOT_INTERVAL_MINUTES !== 0) {
      response.status(400).json({ error: "Scheduled time must use the 30-minute slot grid" });
      return;
    }
    if (input.scheduled_datetime <= clinicNow()) {
      response.status(400).json({ error: "Scheduled time must be in the future" });
      return;
    }

    try {
      const result = await prisma.$transaction(async (transaction) => {
        await lockDoctorDay(transaction, input.doctor_staff_id, input.scheduled_datetime);
        const [patient, doctor, appointmentType] = await Promise.all([
          transaction.patient.findUnique({ where: { patient_id: patientId } }),
          transaction.staff.findUnique({ where: { staff_id: input.doctor_staff_id } }),
          transaction.appointmentType.findFirst({
            where: { appointment_type_id: input.appointment_type_id, is_active: true },
          }),
        ]);
        if (!patient || patient.account_status === "suspended") return { kind: "patient" as const };
        if (!doctor) return { kind: "doctor" as const };
        if (!appointmentType) return { kind: "type" as const };

        const scheduledEnd = addMinutes(input.scheduled_datetime, appointmentType.default_duration_minutes);
        if (scheduledMinutes + appointmentType.default_duration_minutes > PM_END_MINUTES) {
          return { kind: "hours" as const };
        }

        const dayStart = startOfLocalDay(input.scheduled_datetime);
        const dayEnd = addMinutes(dayStart, 24 * 60);
        const overlapCandidates = await transaction.appointment.findMany({
          where: {
            doctor_staff_id: input.doctor_staff_id,
            scheduled_datetime: { gte: dayStart, lt: dayEnd },
            status: { in: [
              AppointmentStatus.pending,
              AppointmentStatus.confirmed,
              AppointmentStatus.checked_in,
            ] },
          },
          include: { appointment_type: true },
        });
        const occupied = overlapCandidates.some((appointment) =>
          overlaps(
            input.scheduled_datetime,
            scheduledEnd,
            appointment.scheduled_datetime,
            addMinutes(appointment.scheduled_datetime, appointment.appointment_type.default_duration_minutes),
          ),
        );
        if (occupied) return { kind: "occupied" as const };

        const block = await transaction.timeBlock.findFirst({
          where: {
            doctor_staff_id: input.doctor_staff_id,
            deleted_at: null,
            start_datetime: { lt: scheduledEnd },
            end_datetime: { gt: input.scheduled_datetime },
          },
        });
        if (block) return { kind: "block" as const };

        const appointment = await transaction.appointment.create({
          data: {
            patient_id: patientId!,
            appointment_type_id: input.appointment_type_id,
            doctor_staff_id: input.doctor_staff_id,
            scheduled_datetime: input.scheduled_datetime,
            booking_channel: "online",
            status: AppointmentStatus.confirmed,
          },
          include: { appointment_type: true, doctor: true, patient: true },
        });
        return { kind: "created" as const, appointment };
      });

      if (result.kind === "patient") {
        response.status(403).json({ error: "Patient account is unavailable" });
        return;
      }
      if (result.kind === "doctor") {
        response.status(404).json({ error: "Doctor not found" });
        return;
      }
      if (result.kind === "type") {
        response.status(404).json({ error: "Appointment type not found" });
        return;
      }
      if (result.kind === "hours") {
        response.status(409).json({ error: "Appointment would end outside PM hours" });
        return;
      }
      if (result.kind === "occupied") {
        response.status(409).json({ error: "Time slot is already taken" });
        return;
      }
      if (result.kind === "block") {
        response.status(409).json({ error: "Time slot overlaps an active time block" });
        return;
      }

      await recordAudit(
        request.auth!.staffId ?? request.auth!.patientId!,
        "POST",
        "/appointments",
        { appointment_id: result.appointment.appointment_id },
      );
      response.status(201).json({ appointment: result.appointment });
    } catch (error) {
      console.error("Appointment booking failed", error);
      response.status(500).json({ error: "Unable to create appointment" });
    }
  });

  return router;
}
