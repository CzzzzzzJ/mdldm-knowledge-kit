import type { UserQueryRepository } from "@/modules/identity";
import { createMongoUserQueryRepository } from "@/providers/database/mongodb/repositories/user-query-repository";

export function createUserQueryService(repository: UserQueryRepository) {
  return {
    listAdminUsers: () => repository.listAdminUsers(100),
    listOrdersForUser: (userId: string) =>
      repository.listOrdersForUser(userId, 100),
    findOrderForUser: (userId: string, orderId: string) =>
      repository.findOrderForUser(userId, orderId),
  };
}

const userQueries = createUserQueryService(createMongoUserQueryRepository());

export const listAdminUsers = userQueries.listAdminUsers;
export const listOrdersForUser = userQueries.listOrdersForUser;
export const findOrderForUser = userQueries.findOrderForUser;
