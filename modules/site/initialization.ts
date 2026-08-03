import { z } from "zod";

import { emailSchema, passwordSchema } from "@/modules/identity/credentials";

export const setupLessonSlugs = [
  "welcome",
  "deploy",
  "database",
  "storage",
  "email",
  "payment",
  "operate",
  "acceptance",
] as const;

export const setupLessonSlugSchema = z.enum(setupLessonSlugs);

export const siteLifecycleStatuses = ["configuring", "live"] as const;
export const siteLifecycleStatusSchema = z.enum(siteLifecycleStatuses);

export const initialAdminInputSchema = z
  .object({
    email: emailSchema,
    emailConfirmation: emailSchema,
    setupToken: z.string().trim().max(256).optional(),
  })
  .strict()
  .refine((value) => value.email === value.emailConfirmation, {
    message: "两次输入的邮箱不一致",
    path: ["emailConfirmation"],
  });

export const initialAdminActivationInputSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string().min(1).max(128),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    message: "两次输入的密码不一致",
    path: ["passwordConfirmation"],
  });

export const setupProgressInputSchema = z
  .object({
    lesson: setupLessonSlugSchema,
    completed: z.boolean(),
  })
  .strict();

export interface SiteInitializationState {
  status: "uninitialized" | "configuring" | "live";
  hasAdmin: boolean;
  completedLessons: string[];
  launchedAt: Date | null;
  source: "database" | "inferred";
}

export interface SetupReadinessItem {
  key: "admin" | "site" | "course" | "product" | "lessons" | "providers";
  label: string;
  detail: string;
  ready: boolean;
  href: string;
}

export interface SetupReadiness {
  canLaunch: boolean;
  items: SetupReadinessItem[];
  warnings: string[];
}
