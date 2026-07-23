import mongoose from "mongoose";

import { getServerEnv } from "@/config/env";
import type { DatabaseProvider } from "@/providers/database/port";

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mdldmMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mdldmMongooseCache ?? {
  connection: null,
  promise: null,
};

global.mdldmMongooseCache = cache;

export async function connectMongo(): Promise<typeof mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.promise) {
    const env = getServerEnv();
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5_000,
      })
      .catch((error: unknown) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

export const mongoDatabaseProvider: DatabaseProvider = {
  async connect() {
    await connectMongo();
  },
  async health() {
    try {
      const client = await connectMongo();
      await client.connection.db?.admin().ping();

      return {
        status: "ok",
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : "MongoDB 连接失败",
      };
    }
  },
};
