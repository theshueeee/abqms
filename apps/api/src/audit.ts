import { prisma } from "./db";

type AuditDetails = Record<string, string | number | boolean | null>;

export async function recordAudit(
  userId: string,
  action: string,
  resource: string,
  details: AuditDetails,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { user_id: userId, action, resource, details },
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
