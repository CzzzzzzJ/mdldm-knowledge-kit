import { requireAuthSecret } from "@/config/env";
import { hashOpaqueToken } from "@/modules/identity/credentials";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { RateLimitBucketModel } from "@/providers/database/mongodb/models/rate-limit";

export async function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await connectMongo();
  const keyHash = hashOpaqueToken(key, requireAuthSecret());
  const now = new Date();
  let bucket = await RateLimitBucketModel.findOneAndUpdate(
    {
      keyHash,
      resetAt: { $gt: now },
    },
    { $inc: { count: 1 } },
    { new: true },
  );

  if (!bucket) {
    try {
      bucket = await RateLimitBucketModel.findOneAndUpdate(
        {
          keyHash,
          $or: [{ resetAt: { $lte: now } }, { resetAt: { $exists: false } }],
        },
        {
          $set: {
            count: 1,
            resetAt: new Date(now.getTime() + options.windowMs),
          },
          $setOnInsert: { keyHash },
        },
        { upsert: true, new: true, runValidators: true },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        return consumeRateLimit(key, options);
      }
      throw error;
    }
  }

  if (!bucket) {
    throw new Error("限流状态创建失败");
  }

  return {
    allowed: bucket.count <= options.limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1_000),
    ),
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  await connectMongo();
  await RateLimitBucketModel.deleteOne({
    keyHash: hashOpaqueToken(key, requireAuthSecret()),
  });
}
