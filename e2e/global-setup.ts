import mongoose from "mongoose";

import {
  activateInitialAdminPassword,
  initializeFirstAdmin,
} from "@/app/lib/site-initialization-service";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { SiteInitializationModel } from "@/providers/database/mongodb/models/site-initialization";
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

  const initialized = await initializeFirstAdmin({
    email: adminEmail,
  });
  const activation = await activateInitialAdminPassword({
    adminId: initialized.admin._id.toString(),
    password: adminPassword,
  });
  if (activation.status !== "activated") {
    throw new Error("E2E 管理员正式密码初始化失败");
  }
  const admin = activation.admin;

  await seedDemo();
  await SiteInitializationModel.findOneAndUpdate(
    { singletonKey: "default" },
    {
      $set: {
        status: "live",
        ownerAdminId: admin._id,
        completedLessons: [],
        adminCreatedAt: new Date(),
        launchedAt: new Date(),
      },
      $setOnInsert: {
        singletonKey: "default",
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );
  await mongoose.disconnect();
}
