import { SessionActorType, StaffRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        actorType: SessionActorType;
        patientId?: string;
        staffId?: string;
        role?: StaffRole;
      };
    }
  }
}

export {};
