import { z } from "zod";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().toLowerCase().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const userIdSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});
