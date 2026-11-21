import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { prisma } from "../db";

export function createReferenceRouter(): Router {
  const router = Router();

  router.get("/appointment-types", requireAuth(), async (_request, response) => {
    try {
      const appointmentTypes = await prisma.appointmentType.findMany({
        where: { is_active: true },
        orderBy: { appointment_type: "asc" },
      });
      response.json({ appointment_types: appointmentTypes });
    } catch (error) {
      console.error("Appointment-type listing failed", error);
      response.status(500).json({ error: "Unable to list appointment types" });
    }
  });

  router.get("/doctors", requireAuth(), async (_request, response) => {
    try {
      const doctors = await prisma.staff.findMany({
        where: { is_active: true },
        select: {
          staff_id: true,
          full_name: true,
        },
        orderBy: { full_name: "asc" },
      });
      response.json({ doctors });
    } catch (error) {
      console.error("Doctor listing failed", error);
      response.status(500).json({ error: "Unable to list doctors" });
    }
  });

  router.get("/cancellation-reasons", requireAuth(), async (_request, response) => {
    try {
      const reasons = await prisma.cancellationReason.findMany({
        where: { is_active: true, is_system: false },
        orderBy: { reason_text: "asc" },
      });
      response.json({ cancellation_reasons: reasons });
    } catch (error) {
      console.error("Cancellation-reason listing failed", error);
      response.status(500).json({ error: "Unable to list cancellation reasons" });
    }
  });

  return router;
}
