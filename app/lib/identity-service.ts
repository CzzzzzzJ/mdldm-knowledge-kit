import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import {
  reportOperationalFailure,
  resolveOperationalFailures,
  structuredLog,
} from "@/app/lib/operations-service";
import { getServerEnv, requireAuthSecret } from "@/config/env";
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/modules/identity/credentials";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  IdentityTokenModel,
  type IdentityTokenPurpose,
} from "@/providers/database/mongodb/models/identity-token";
import { SessionModel } from "@/providers/database/mongodb/models/session";
import {
  UserModel,
  type UserDocument,
} from "@/providers/database/mongodb/models/user";
import { getEmailProvider } from "@/providers/email";

function tokenExpiry(purpose: IdentityTokenPurpose): Date {
  const env = getServerEnv();
  const lifetimeMs =
    purpose === "verify_email"
      ? env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1_000
      : env.PASSWORD_RESET_TTL_MINUTES * 60 * 1_000;
  return new Date(Date.now() + lifetimeMs);
}

async function issueIdentityToken(
  user: UserDocument,
  purpose: IdentityTokenPurpose,
): Promise<string> {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token, requireAuthSecret());

  await IdentityTokenModel.deleteMany({
    userId: user._id,
    purpose,
    usedAt: null,
  });
  await IdentityTokenModel.create({
    userId: user._id,
    purpose,
    tokenHash,
    expiresAt: tokenExpiry(purpose),
    usedAt: null,
  });

  return token;
}

async function sendIdentityAction(
  user: UserDocument,
  purpose: IdentityTokenPurpose,
): Promise<void> {
  const token = await issueIdentityToken(user, purpose);
  const env = getServerEnv();
  const pathname =
    purpose === "verify_email" ? "/verify-email" : "/reset-password";
  const actionUrl = new URL(pathname, env.APP_URL);
  actionUrl.searchParams.set("token", token);

  const provider = getEmailProvider();
  try {
    await provider.sendIdentityEmail({
      to: user.email,
      recipientName: user.name,
      actionUrl: actionUrl.toString(),
      kind: purpose,
    });
    await resolveOperationalFailures({
      category: "email",
      code: "IDENTITY_EMAIL_FAILED",
      sourceType: "user",
      sourceId: user._id.toString(),
    });
  } catch (error) {
    await reportOperationalFailure({
      category: "email",
      severity: "error",
      code: "IDENTITY_EMAIL_FAILED",
      summary: "身份验证邮件发送失败",
      error,
      provider: provider.name,
      sourceType: "user",
      sourceId: user._id.toString(),
    });
    throw error;
  }
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: UserDocument; emailSent: boolean }> {
  await connectMongo();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "user",
    status: "active",
    emailVerified: false,
  });

  try {
    await sendIdentityAction(user, "verify_email");
    return { user, emailSent: true };
  } catch {
    structuredLog("warn", "registration_email_not_sent", {
      userId: user._id.toString(),
    });
    return { user, emailSent: false };
  }
}

export async function resendVerification(email: string): Promise<void> {
  await connectMongo();
  const user = await UserModel.findOne({
    email,
    status: "active",
    emailVerified: false,
  });

  if (user) {
    await sendIdentityAction(user, "verify_email");
  }
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  await connectMongo();
  const now = new Date();
  const record = await IdentityTokenModel.findOneAndUpdate(
    {
      tokenHash: hashOpaqueToken(token, requireAuthSecret()),
      purpose: "verify_email",
      expiresAt: { $gt: now },
      usedAt: null,
    },
    { $set: { usedAt: now } },
    { new: true },
  );

  if (!record) {
    return false;
  }

  const result = await UserModel.updateOne(
    { _id: record.userId, status: "active" },
    { $set: { emailVerified: true } },
  );
  await IdentityTokenModel.updateMany(
    {
      userId: record.userId,
      purpose: "verify_email",
      usedAt: null,
    },
    { $set: { usedAt: now } },
  );
  return result.modifiedCount === 1 || result.matchedCount === 1;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await connectMongo();
  const user = await UserModel.findOne({
    email,
    status: "active",
    emailVerified: true,
  });

  if (user) {
    await sendIdentityAction(user, "reset_password");
  }
}

async function consumePasswordResetToken(
  token: string,
): Promise<UserDocument | null> {
  const now = new Date();
  const record = await IdentityTokenModel.findOneAndUpdate(
    {
      tokenHash: hashOpaqueToken(token, requireAuthSecret()),
      purpose: "reset_password",
      expiresAt: { $gt: now },
      usedAt: null,
    },
    { $set: { usedAt: now } },
    { new: true },
  );

  if (!record) {
    return null;
  }

  return UserModel.findOne({
    _id: record.userId,
    status: "active",
    emailVerified: true,
  }).select("+passwordHash");
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<UserDocument | null> {
  await connectMongo();
  const user = await consumePasswordResetToken(input.token);
  if (!user) {
    return null;
  }

  user.passwordHash = await bcrypt.hash(input.password, 12);
  await user.save();
  await SessionModel.deleteMany({ userId: user._id });
  return user;
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<UserDocument | null> {
  if (!Types.ObjectId.isValid(input.userId)) {
    return null;
  }

  await connectMongo();
  const user = await UserModel.findOne({
    _id: input.userId,
    status: "active",
  }).select("+passwordHash");

  if (
    !user ||
    !(await bcrypt.compare(input.currentPassword, user.passwordHash))
  ) {
    return null;
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  await user.save();
  await SessionModel.deleteMany({ userId: user._id });
  return user;
}
