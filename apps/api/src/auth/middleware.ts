import { RequestHandler } from "express";
import { SessionActorType, StaffRole } from "@prisma/client";
import { prisma } from "../db";
import { hashToken } from "./security";

export type AuthenticatedRequest = Parameters<RequestHandler>[0];

function readCookie(request: AuthenticatedRequest, name: string): string | undefined {
  const header = request.header("cookie");
  return header
    ?.split(";")
    .map((part) => part.trim())
    .map((part) => part.split("="))
    .find(([key]) => key === name)?.[1];
}

export function requireAuth(roles?: StaffRole[]): RequestHandler {
  return async (request, response, next) => {
    const token = readCookie(request, "dq_session");
    if (!token) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { token_hash: hashToken(token) },
      include: { patient: true, staff: true },
    });

    if (!session || session.revoked_at || session.expires_at <= new Date()) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    if (session.patient && session.patient.account_status === "suspended") {
      response.status(403).json({ error: "Account is suspended" });
      return;
    }

    if (session.staff && (!session.staff.is_active || (roles && !roles.includes(session.staff.role)))) {
      response.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    request.auth = {
      actorType: session.actor_type,
      patientId: session.patient_id ?? undefined,
      staffId: session.staff_id ?? undefined,
      role: session.staff?.role,
    };
    next();
  };
}
