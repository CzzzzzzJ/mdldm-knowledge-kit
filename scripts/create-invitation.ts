import { loadEnvConfig } from "@next/env";
import { z } from "zod";

import { requireAuthSecret } from "@/config/env";
import {
  generateInvitationCode,
  hashInvitationCode,
  invitationCodeHint,
} from "@/modules/entitlement/invitation";
import { entitlementTypes } from "@/modules/entitlement";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { InvitationModel } from "@/providers/database/mongodb/models/invitation";
import { UserModel } from "@/providers/database/mongodb/models/user";

loadEnvConfig(process.cwd());

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const optionalNumber = z.preprocess(
  (value) => (value === undefined ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

const schema = z
  .object({
    adminEmail: z.string().email().optional(),
    type: z.enum(entitlementTypes),
    targetId: z.string().trim().min(1).optional(),
    durationDays: optionalNumber,
    maxRedemptions: optionalNumber.default(1),
    expiresAt: z.coerce.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "membership" && value.targetId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetId"],
        message: "membership 邀请码不能设置 targetId",
      });
    }
    if (value.type !== "membership" && !value.targetId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetId"],
        message: "course 或 series 邀请码必须设置 targetId",
      });
    }
  });

async function main() {
  const input = schema.parse({
    adminEmail: readArgument("admin-email"),
    type: readArgument("type"),
    targetId: readArgument("target-id"),
    durationDays: readArgument("duration-days"),
    maxRedemptions: readArgument("max-redemptions"),
    expiresAt: readArgument("expires-at"),
  });

  await connectMongo();
  const admin = await UserModel.findOne({
    ...(input.adminEmail
      ? { email: input.adminEmail.toLowerCase() }
      : {}),
    role: "admin",
    status: "active",
  });
  if (!admin) {
    throw new Error("未找到可用管理员，请先运行 create-admin");
  }

  const code = generateInvitationCode();
  await InvitationModel.create({
    codeHash: hashInvitationCode(code, requireAuthSecret()),
    codeHint: invitationCodeHint(code),
    entitlementType: input.type,
    targetId: input.type === "membership" ? null : input.targetId,
    durationDays: input.durationDays ?? null,
    maxRedemptions: input.maxRedemptions,
    redemptionCount: 0,
    status: "active",
    expiresAt: input.expiresAt ?? null,
    createdBy: admin._id,
  });

  console.log("邀请码创建成功。明文只显示这一次，请安全保存：");
  console.log(code);
}

main()
  .catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      console.error(
        '用法：pnpm create-invitation --type membership --duration-days 365 --max-redemptions 1 --admin-email "admin@example.com"',
      );
      for (const issue of error.issues) {
        console.error(`- ${issue.path.join(".")}: ${issue.message}`);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
