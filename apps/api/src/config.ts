import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const config = configSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  API_PORT: process.env.API_PORT,
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS,
  RESET_TOKEN_TTL_MINUTES: process.env.RESET_TOKEN_TTL_MINUTES,
  NODE_ENV: process.env.NODE_ENV,
});
