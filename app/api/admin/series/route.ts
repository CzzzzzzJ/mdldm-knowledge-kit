import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CatalogAdminError,
  createSeries,
} from "@/app/lib/catalog-admin-service";
import {
  accessLevels,
  seriesDiscoveryMetadataSchema,
} from "@/modules/catalog";

const seriesInput = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(2_000),
  accessLevel: z.enum(accessLevels).default("public"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  coverImageUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = seriesInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "系列数据格式错误" }, { status: 400 });
  }

  const metadata = seriesDiscoveryMetadataSchema.safeParse({
    category: parsed.data.category,
    tags: parsed.data.tags,
    coverImageUrl: parsed.data.coverImageUrl,
  });
  if (!metadata.success) {
    return NextResponse.json(
      { error: "系列分类、标签或封面格式错误" },
      { status: 400 },
    );
  }

  try {
    const series = await createSeries({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      accessLevel: parsed.data.accessLevel,
      metadata: metadata.data,
    });
    return NextResponse.json({ series }, { status: 201 });
  } catch (error) {
    if (error instanceof CatalogAdminError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
