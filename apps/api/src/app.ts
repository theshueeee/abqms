import express from "express";
import { prisma } from "./db";
import { createAuthRouter } from "./auth/routes";
import { createTimeblocksRouter } from "./timeblocks/routes";
import { createAppointmentsRouter } from "./appointments/routes";
import { createReferenceRouter } from "./reference/routes";
import { createAccountsRouter } from "./accounts/routes";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api/auth", createAuthRouter());
  app.use("/api/timeblocks", createTimeblocksRouter());
  app.use("/api/appointments", createAppointmentsRouter());
  app.use("/api/accounts", createAccountsRouter());
  app.use("/api", createReferenceRouter());

  app.get("/api/health", async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json({ status: "ok", database: "ok" });
    } catch (error) {
      console.error("Health check database query failed", error);
      response.status(503).json({ status: "degraded", database: "unavailable" });
    }
  });

  return app;
}
