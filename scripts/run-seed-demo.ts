import mongoose from "mongoose";

import { seedDemo } from "@/scripts/seed-demo";

seedDemo()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
