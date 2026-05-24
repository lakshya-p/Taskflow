import { ActivityAction, EntityType, ProjectStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import { cacheService } from "../../utils/cache.service";
import { getPagination, paginateResult } from "../../utils/pagination";
import { activityService } from "../activity/activity.service";
import { projectsRepository } from "./projects.repository";

export const projectsService = {
  async create(userId: string, workspaceId: string, input: { name: string; description?: string; status?: ProjectStatus }) {
    const project = await projectsRepository.create({ workspaceId, ...input });
    await activityService.create({
      action: ActivityAction.PROJECT_CREATED,
      entityType: EntityType.PROJECT,
      entityId: project.id,
      userId,
      workspaceId,
      metadata: { name: project.name, status: project.status }
    });
    await cacheService.set(`project:${project.id}`, project);
    return project;
  },

  async list(workspaceId: string, query: { page?: number; limit?: number; status?: ProjectStatus }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await projectsRepository.list(workspaceId, { status: query.status }, skip, take);
    return paginateResult(items, total, page, limit);
  },

  async get(id: string) {
    const key = `project:${id}`;
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const project = await projectsRepository.findById(id);
    if (!project) throw new AppError("Project not found", 404);
    await cacheService.set(key, project);
    return project;
  },

  async update(userId: string, id: string, input: { name?: string; description?: string | null; status?: ProjectStatus }) {
    const existing = await projectsRepository.findById(id);
    if (!existing) throw new AppError("Project not found", 404);
    const project = await projectsRepository.update(id, input);
    await cacheService.del(`project:${id}`);
    await activityService.create({
      action: ActivityAction.PROJECT_UPDATED,
      entityType: EntityType.PROJECT,
      entityId: id,
      userId,
      workspaceId: existing.workspaceId,
      metadata: input
    });
    return project;
  },

  async delete(userId: string, id: string) {
    const existing = await projectsRepository.findById(id);
    if (!existing) throw new AppError("Project not found", 404);
    await activityService.create({
      action: ActivityAction.PROJECT_DELETED,
      entityType: EntityType.PROJECT,
      entityId: id,
      userId,
      workspaceId: existing.workspaceId,
      metadata: { name: existing.name }
    });
    await cacheService.del(`project:${id}`);
    return projectsRepository.delete(id);
  }
};
