import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";

const roleSchema = z.nativeEnum(WorkspaceRole);

export const inviteMemberSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  body: z.object({
    email: z.string().email().toLowerCase(),
    role: roleSchema.default("MEMBER")
  })
});

export const listMembersSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional()
  })
});

export const memberRoleSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1), memberId: z.string().min(1) }),
  body: z.object({ role: roleSchema })
});

export const memberIdSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1), memberId: z.string().min(1) })
});
