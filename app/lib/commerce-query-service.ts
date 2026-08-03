import type { CommerceQueryRepository } from "@/modules/commerce";
import { createMongoCommerceQueryRepository } from "@/providers/database/mongodb/repositories/commerce-query-repository";

export function createCommerceQueryService(
  repository: CommerceQueryRepository,
) {
  return {
    getAdminProductWorkspace: () => repository.getAdminProductWorkspace(),
  };
}

const commerceQueries = createCommerceQueryService(
  createMongoCommerceQueryRepository(),
);

export const getAdminProductWorkspace =
  commerceQueries.getAdminProductWorkspace;
