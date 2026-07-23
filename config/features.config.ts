import { getServerEnv } from "@/config/env";

const env = getServerEnv();

export const featuresConfig = {
  membership: env.FEATURE_MEMBERSHIP,
  singleCoursePurchase: env.FEATURE_SINGLE_COURSE,
  comments: env.FEATURE_COMMENTS,
  assignments: env.FEATURE_ASSIGNMENTS,
} as const;

export type FeatureName = keyof typeof featuresConfig;
