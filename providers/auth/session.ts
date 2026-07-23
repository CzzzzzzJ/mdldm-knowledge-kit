import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { getServerEnv, requireAuthSecret } from "@/config/env";
import type { UserAccount } from "@/modules/identity";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { SessionModel } from "@/providers/database/mongodb/models/session";
import {
  UserModel,
  type UserDocument,
} from "@/providers/database/mongodb/models/user";

function hashToken(token: string): string {
  const secret = requireAuthSecret();
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

function toAccount(user: UserDocument): UserAccount {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  };
}

export async function createSession(user: UserDocument): Promise<void> {
  await connectMongo();

  const env = getServerEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );

  await SessionModel.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt,
    lastSeenAt: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (token) {
    await connectMongo();
    await SessionModel.deleteOne({ tokenHash: hashToken(token) });
  }

  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const env = getServerEnv();
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  await connectMongo();
  const session = await SessionModel.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const user = await UserModel.findById(session.userId);
  if (!user || user.status !== "active") {
    return null;
  }

  return toAccount(user);
}

export async function requireAdmin(): Promise<UserAccount> {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }

  return user;
}
