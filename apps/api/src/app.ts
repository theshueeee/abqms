import express from "express";
import { prisma } from "./db";

export function createApp() {
  const app = express();

  app.use(express.json());

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
