import { createHmac, randomBytes } from "node:crypto";

import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, "密码至少需要 12 位")
  .max(128, "密码不能超过 128 位")
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
    message: "密码必须同时包含字母和数字",
  });

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generates a per-deployment bootstrap credential with at least 144 bits of
 * entropy. The fixed prefix guarantees that the value also satisfies the
 * human password policy without reducing the random portion.
 */
export function generateTemporaryPassword(): string {
  return `MK1-${randomBytes(18).toString("base64url")}`;
}

export function hashOpaqueToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
