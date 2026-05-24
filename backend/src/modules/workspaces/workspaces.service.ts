import { ActivityAction, EntityType } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import { cacheService } from "../../utils/cache.service";
import { getPagination, paginateResult } from "../../utils/pagination";
import { activityService } from "../activity/activity.service";
import { workspacesRepository } from "./workspaces.repository";

export const workspacesService = {
  async create(userId: string, input: { name: string; description?: string }) {
    const workspace = await workspacesRepository.createWithOwner({ ...input, userId });
    await activityService.create({
      action: ActivityAction.WORKSPACE_CREATED,
      entityType: EntityType.WORKSPACE,
      entityId: workspace.id,
      userId,
      workspaceId: workspace.id,
      metadata: { name: workspace.name }
    });
    await cacheService.set(`workspace:${workspace.id}`, workspace);
    return workspace;
  },

  async list(userId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await workspacesRepository.listForUser(userId, skip, take);
    return paginateResult(items, total, page, limit);
  },

  async get(id: string) {
    const key = `workspace:${id}`;
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const workspace = await workspacesRepository.findById(id);
    if (!workspace) throw new AppError("Workspace not found", 404);
    await cacheService.set(key, workspace);
    return workspace;
  },

  async update(userId: string, id: string, input: { name?: string; description?: string | null }) {
    const workspace = await workspacesRepository.update(id, input);
    await cacheService.del(`workspace:${id}`);
    await activityService.create({
      action: ActivityAction.WORKSPACE_UPDATED,
      entityType: EntityType.WORKSPACE,
      entityId: id,
      userId,
      workspaceId: id,
      metadata: input
    });
    return workspace;
  },

  async delete(userId: string, id: string) {
    await activityService.create({
      action: ActivityAction.WORKSPACE_DELETED,
      entityType: EntityType.WORKSPACE,
      entityId: id,
      userId,
      workspaceId: id
    });
    await cacheService.del(`workspace:${id}`);
    return workspacesRepository.delete(id);
  }
};
