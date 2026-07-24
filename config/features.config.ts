import { getServerEnv } from "@/config/env";

export function getFeaturesConfig() {
  const env = getServerEnv();
  return {
    membership: env.FEATURE_MEMBERSHIP,
    singleCoursePurchase: env.FEATURE_SINGLE_COURSE,
    comments: env.FEATURE_COMMENTS,
    assignments: env.FEATURE_ASSIGNMENTS,
  } as const;
}

export type FeatureName = keyof ReturnType<typeof getFeaturesConfig>;
