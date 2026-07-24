import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  emailSchema,
  passwordSchema,
} from "@/modules/identity/credentials";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { UserModel } from "@/providers/database/mongodb/models/user";

loadEnvConfig(process.cwd());

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
});

async function main() {
  const input = inputSchema.parse({
    name: readArgument("name"),
    email: readArgument("email"),
    password: readArgument("password"),
  });

  await connectMongo();

  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`管理员已存在：${input.email}`);
      return;
    }

    throw new Error(
      `邮箱 ${input.email} 已属于普通用户。请在正式后台中执行受控提权。`,
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
  });

  console.log(`管理员创建成功：${input.email}`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      console.error(
        "用法：npm run create-admin -- --name \"Admin\" --email admin@example.com --password \"至少12位且包含字母和数字\"",
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
