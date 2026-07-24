import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import { syncConfiguredProducts } from "@/app/lib/commerce-service";

loadEnvConfig(process.cwd());

async function main() {
  const result = await syncConfiguredProducts();
  console.log(`商品同步完成：${result.synced} 个可用商品`);
  if (result.unavailable.length > 0) {
    console.log(
      `以下商品因目标课程或系列不存在而停用：${result.unavailable.join(", ")}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
