import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";

export const MIN_PASSWORD_LENGTH = 12;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
