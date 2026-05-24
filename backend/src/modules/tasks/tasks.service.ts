import { ActivityAction, EntityType, Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import { cacheService } from "../../utils/cache.service";
import { getPagination, paginateResult } from "../../utils/pagination";
import { activityService } from "../activity/activity.service";
import { TaskFilters, tasksRepository } from "./tasks.repository";

const parseDate = (value?: string | null) => (value ? new Date(value) : value === null ? null : undefined);

const ensureAssignable = async (workspaceId: string, userId?: string | null) => {
  if (!userId) return;
  const member = await tasksRepository.isWorkspaceMember(workspaceId, userId);
  if (!member) throw new AppError("Task can only be assigned to a workspace member", 422);
};

export const tasksService = {
  async create(
    userId: string,
    projectId: string,
    input: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      assignedTo?: string | null;
    }
  ) {
    const project = await tasksRepository.projectWorkspace(projectId);
    if (!project) throw new AppError("Project not found", 404);
    await ensureAssignable(project.workspaceId, input.assignedTo);
    const task = await tasksRepository.create({
      ...input,
      dueDate: parseDate(input.dueDate) as Date | undefined,
      projectId,
      createdBy: userId
    });
    await cacheService.set(`task:${task.id}`, task);
    await activityService.create({
      action: ActivityAction.TASK_CREATED,
      entityType: EntityType.TASK,
      entityId: task.id,
      userId,
      workspaceId: project.workspaceId,
      metadata: { title: task.title, priority: task.priority, assignedTo: task.assignedTo }
    });
    return task;
  },

  async list(projectId: string, query: TaskFilters & { page?: number; limit?: number }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await tasksRepository.list(projectId, query, skip, take);
    return paginateResult(items, total, page, limit);
  },

  async get(id: string) {
    const key = `task:${id}`;
    const cached = await cacheService.get(key);
    if (cached) return cached;
    const task = await tasksRepository.findById(id);
    if (!task) throw new AppError("Task not found", 404);
    await cacheService.set(key, task);
    return task;
  },

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw new AppError("Task not found", 404);
    await ensureAssignable(existing.project.workspaceId, input.assignedTo as string | null | undefined);
    const data: Prisma.TaskUpdateInput = {
      title: input.title as string | undefined,
      description: input.description as string | null | undefined,
      status: input.status as TaskStatus | undefined,
      priority: input.priority as TaskPriority | undefined,
      dueDate: parseDate(input.dueDate as string | null | undefined) as Date | null | undefined,
      assignee:
        input.assignedTo === undefined
          ? undefined
          : input.assignedTo === null
            ? { disconnect: true }
            : { connect: { id: input.assignedTo as string } }
    };
    const task = await tasksRepository.update(id, data);
    await cacheService.del(`task:${id}`);
    await activityService.create({
      action: ActivityAction.TASK_UPDATED,
      entityType: EntityType.TASK,
      entityId: id,
      userId,
      workspaceId: existing.project.workspaceId,
      metadata: input as Prisma.InputJsonObject
    });
    return task;
  },

  async updateStatus(userId: string, id: string, status: TaskStatus) {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw new AppError("Task not found", 404);
    const task = await tasksRepository.update(id, { status });
    await cacheService.del(`task:${id}`);
    await activityService.create({
      action: ActivityAction.TASK_STATUS_CHANGED,
      entityType: EntityType.TASK,
      entityId: id,
      userId,
      workspaceId: existing.project.workspaceId,
      metadata: { previousStatus: existing.status, nextStatus: status }
    });
    return task;
  },

  async assign(userId: string, id: string, assignedTo: string | null) {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw new AppError("Task not found", 404);
    await ensureAssignable(existing.project.workspaceId, assignedTo);
    const task = await tasksRepository.update(id, {
      assignee: assignedTo ? { connect: { id: assignedTo } } : { disconnect: true }
    });
    await cacheService.del(`task:${id}`);
    await activityService.create({
      action: ActivityAction.TASK_ASSIGNED,
      entityType: EntityType.TASK,
      entityId: id,
      userId,
      workspaceId: existing.project.workspaceId,
      metadata: { previousAssignee: existing.assignedTo, assignedTo }
    });
    return task;
  },

  async delete(userId: string, id: string) {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw new AppError("Task not found", 404);
    await tasksRepository.delete(id);
    await cacheService.del(`task:${id}`);
    await activityService.create({
      action: ActivityAction.TASK_DELETED,
      entityType: EntityType.TASK,
      entityId: id,
      userId,
      workspaceId: existing.project.workspaceId,
      metadata: { title: existing.title }
    });
  }
};
