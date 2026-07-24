import { randomBytes } from "node:crypto";

import { hashOpaqueToken } from "@/modules/identity/credentials";

export function generateInvitationCode(): string {
  const value = randomBytes(9).toString("base64url").toUpperCase();
  return `MDLDM-${value}`;
}

export function normalizeInvitationCode(code: string): string {
  return code.trim().toUpperCase();
}

export function hashInvitationCode(code: string, secret: string): string {
  return hashOpaqueToken(normalizeInvitationCode(code), secret);
}

export function invitationCodeHint(code: string): string {
  const normalized = normalizeInvitationCode(code);
  return `${normalized.slice(0, 8)}…${normalized.slice(-4)}`;
}
