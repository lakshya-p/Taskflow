import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

const dueDate = z.string().datetime().optional();

export const createTaskSchema = z.object({
  params: z.object({ projectId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(2).max(180),
    description: z.string().max(2000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate,
    assignedTo: z.string().min(1).nullable().optional()
  })
});

export const listTasksSchema = z.object({
  params: z.object({ projectId: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    search: z.string().max(120).optional(),
    sortBy: z.enum(["createdAt", "dueDate", "priority"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional()
  })
});

export const taskIdSchema = z.object({ params: z.object({ taskId: z.string().min(1) }) });

export const updateTaskSchema = z.object({
  params: z.object({ taskId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(2).max(180).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: dueDate.nullable().optional(),
    assignedTo: z.string().min(1).nullable().optional()
  })
});

export const updateTaskStatusSchema = z.object({
  params: z.object({ taskId: z.string().min(1) }),
  body: z.object({ status: z.nativeEnum(TaskStatus) })
});

export const assignTaskSchema = z.object({
  params: z.object({ taskId: z.string().min(1) }),
  body: z.object({ assignedTo: z.string().min(1).nullable() })
});
