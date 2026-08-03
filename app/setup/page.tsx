import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const params = await searchParams;
  const lesson = params.lesson
    ? `?lesson=${encodeURIComponent(params.lesson)}`
    : "";
  redirect(`/admin/setup${lesson}`);
}
