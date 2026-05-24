import { z } from "zod";

export const workspaceIdParams = z.object({ workspaceId: z.string().min(1) });

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional()
  })
});

export const updateWorkspaceSchema = z.object({
  params: workspaceIdParams,
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(500).nullable().optional()
  })
});

export const listWorkspacesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});

export const getWorkspaceSchema = z.object({ params: workspaceIdParams });
