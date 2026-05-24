import { ActivityAction, EntityType, WorkspaceRole } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import { getPagination, paginateResult } from "../../utils/pagination";
import { canManageRole } from "../../middlewares/rbac.middleware";
import { activityService } from "../activity/activity.service";
import { cacheService } from "../../utils/cache.service";
import { membersRepository } from "./members.repository";

export const membersService = {
  async invite(actorId: string, actorRole: WorkspaceRole, workspaceId: string, input: { email: string; role: WorkspaceRole }) {
    if (actorRole === "ADMIN" && (input.role === "OWNER" || input.role === "ADMIN")) {
      throw new AppError("Admins can only add members or viewers", 403);
    }
    const user = await membersRepository.findUserByEmail(input.email);
    if (!user) throw new AppError("User must register before being added to a workspace", 404);
    const existing = await membersRepository.findByWorkspaceUser(workspaceId, user.id);
    if (existing) throw new AppError("User is already a workspace member", 409);
    const member = await membersRepository.create(workspaceId, user.id, input.role);
    await cacheService.del(`workspace:${workspaceId}`);
    await activityService.create({
      action: ActivityAction.MEMBER_ADDED,
      entityType: EntityType.MEMBER,
      entityId: member.id,
      userId: actorId,
      workspaceId,
      metadata: { addedUserId: user.id, role: input.role }
    });
    return member;
  },

  async list(workspaceId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await membersRepository.list(workspaceId, skip, take);
    return paginateResult(items, total, page, limit);
  },

  async updateRole(actorId: string, actorRole: WorkspaceRole, workspaceId: string, memberId: string, role: WorkspaceRole) {
    const member = await membersRepository.findMember(memberId);
    if (!member || member.workspaceId !== workspaceId) throw new AppError("Workspace member not found", 404);
    if (!canManageRole(actorRole, member.role, role)) throw new AppError("Cannot update this member role", 403);
    if (member.role === "OWNER" && role !== "OWNER" && (await membersRepository.ownerCount(workspaceId)) <= 1) {
      throw new AppError("Cannot demote the last workspace owner", 409);
    }
    const updated = await membersRepository.updateRole(memberId, role);
    await cacheService.del(`workspace:${workspaceId}`);
    await activityService.create({
      action: ActivityAction.MEMBER_ROLE_UPDATED,
      entityType: EntityType.MEMBER,
      entityId: memberId,
      userId: actorId,
      workspaceId,
      metadata: { previousRole: member.role, nextRole: role, userId: member.userId }
    });
    return updated;
  },

  async remove(actorId: string, actorRole: WorkspaceRole, workspaceId: string, memberId: string) {
    const member = await membersRepository.findMember(memberId);
    if (!member || member.workspaceId !== workspaceId) throw new AppError("Workspace member not found", 404);
    if (!canManageRole(actorRole, member.role)) throw new AppError("Cannot remove this member", 403);
    if (member.role === "OWNER" && (await membersRepository.ownerCount(workspaceId)) <= 1) {
      throw new AppError("Cannot remove the last workspace owner", 409);
    }
    await membersRepository.delete(memberId);
    await cacheService.del(`workspace:${workspaceId}`);
    await activityService.create({
      action: ActivityAction.MEMBER_REMOVED,
      entityType: EntityType.MEMBER,
      entityId: memberId,
      userId: actorId,
      workspaceId,
      metadata: { removedUserId: member.userId, role: member.role }
    });
  }
};
