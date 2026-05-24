import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  projectId: true,
  assignedTo: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, workspaceId: true } }
};

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "priority";
  sortOrder?: "asc" | "desc";
};

export const tasksRepository = {
  create(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
    projectId: string;
    assignedTo?: string | null;
    createdBy: string;
  }) {
    return prisma.task.create({ data, select: taskSelect });
  },
  list(projectId: string, filters: TaskFilters, skip: number, take: number) {
    const where: Prisma.TaskWhereInput = {
      projectId,
      status: filters.status,
      priority: filters.priority,
      assignedTo: filters.assignedTo,
      dueDate: filters.dueDate ? { lte: new Date(filters.dueDate) } : undefined,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined
    };
    const orderBy: Prisma.TaskOrderByWithRelationInput = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder ?? "desc" }
      : { createdAt: "desc" };
    return prisma.$transaction([
      prisma.task.findMany({ where, skip, take, orderBy, select: taskSelect }),
      prisma.task.count({ where })
    ]);
  },
  findById(id: string) {
    return prisma.task.findUnique({ where: { id }, select: taskSelect });
  },
  update(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({ where: { id }, data, select: taskSelect });
  },
  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },
  projectWorkspace(projectId: string) {
    return prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  },
  isWorkspaceMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { id: true } });
  }
};
