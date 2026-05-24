import { ActivityAction, EntityType, Prisma } from "@prisma/client";
import { getPagination, paginateResult } from "../../utils/pagination";
import { activityRepository } from "./activity.repository";

export const activityService = {
  async create(input: {
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    userId?: string | null;
    workspaceId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return activityRepository.create(input);
  },

  async listWorkspace(workspaceId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await activityRepository.findByWorkspace(workspaceId, skip, take);
    return paginateResult(items, total, page, limit);
  },

  async listEntity(entityType: EntityType, entityId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await activityRepository.findByEntity(entityType, entityId, skip, take);
    return paginateResult(items, total, page, limit);
  }
};
