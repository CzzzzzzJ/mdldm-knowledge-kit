import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectMongo } from "@/providers/database/mongodb/connection";
import { UserModel } from "@/providers/database/mongodb/models/user";
import { seedDemo } from "@/scripts/seed-demo";

const adminEmail = "admin@example.com";
const adminPassword = "local-demo-admin-password-2026";

export default async function globalSetup() {
  await connectMongo();
  const database = mongoose.connection.db;
  if (!database || !database.databaseName.endsWith("_e2e")) {
    throw new Error(
      "E2E 只允许清理名称以 _e2e 结尾的隔离数据库",
    );
  }
  await database.dropDatabase();

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await UserModel.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        name: "E2E Admin",
        passwordHash,
        role: "admin",
        status: "active",
        emailVerified: true,
      },
      $setOnInsert: {
        email: adminEmail,
      },
    },
    { upsert: true, runValidators: true },
  );

  await seedDemo();
  await mongoose.disconnect();
}
