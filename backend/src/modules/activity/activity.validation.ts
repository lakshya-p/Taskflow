import { z } from "zod";

export const activityQuerySchema = z.object({
  params: z.object({
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
    taskId: z.string().optional()
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});
