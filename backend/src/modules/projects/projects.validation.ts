import { ProjectStatus } from "@prisma/client";
import { z } from "zod";

export const createProjectSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(140),
    description: z.string().max(1000).optional(),
    status: z.nativeEnum(ProjectStatus).optional()
  })
});

export const listProjectsSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.nativeEnum(ProjectStatus).optional()
  })
});

export const projectIdSchema = z.object({ params: z.object({ projectId: z.string().min(1) }) });

export const updateProjectSchema = z.object({
  params: z.object({ projectId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(140).optional(),
    description: z.string().max(1000).nullable().optional(),
    status: z.nativeEnum(ProjectStatus).optional()
  })
});
