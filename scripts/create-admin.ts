import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  emailSchema,
  passwordSchema,
} from "@/modules/identity/credentials";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { SessionModel } from "@/providers/database/mongodb/models/session";
import { UserModel } from "@/providers/database/mongodb/models/user";

loadEnvConfig(process.cwd());

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: emailSchema,
  password: passwordSchema,
  resetExisting: z.boolean(),
});

async function main() {
  const input = inputSchema.parse({
    name: readArgument("name"),
    email: readArgument("email"),
    password: readArgument("password"),
    resetExisting: process.argv.includes("--reset-existing"),
  });

  await connectMongo();

  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    if (existing.role === "admin") {
      if (input.resetExisting) {
        existing.passwordHash = await bcrypt.hash(input.password, 12);
        existing.status = "active";
        existing.emailVerified = true;
        existing.requiresPasswordChange = false;
        await existing.save();
        await SessionModel.deleteMany({ userId: existing._id });
        console.log(`管理员密码已受控重置：${input.email}`);
        return;
      }
      console.log(`管理员已存在：${input.email}`);
      return;
    }

    throw new Error(
      `邮箱 ${input.email} 已属于普通用户。请在正式后台中执行受控提权。`,
    );
  }

  if (!input.name) {
    throw new Error("首次创建管理员时必须提供 --name");
  }

  const existingAdmin = await UserModel.findOne({ role: "admin" });
  if (existingAdmin) {
    throw new Error(
      `首个管理员已经存在：${existingAdmin.email}。请从用户管理或账号安全页面维护管理员账号。`,
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "admin",
    status: "active",
    emailVerified: true,
    requiresPasswordChange: false,
  });

  console.log(`管理员创建成功：${input.email}`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      console.error(
        "用法：pnpm create-admin --name \"Admin\" --email admin@example.com --password \"至少12位且包含字母和数字\"；已有管理员恢复时显式增加 --reset-existing",
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
