import { NextFunction, Request, Response } from "express";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { requestParam } from "../utils/requestParam";

const rank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4
};

const projectWorkspaceId = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  return project?.workspaceId;
};

const taskWorkspaceId = async (taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { workspaceId: true } } }
  });
  return task?.project.workspaceId;
};

export const resolveWorkspaceId = async (req: Request) => {
  if (req.params.workspaceId) return requestParam(req.params.workspaceId, "workspaceId");
  if (req.params.projectId) return projectWorkspaceId(requestParam(req.params.projectId, "projectId"));
  if (req.params.taskId) return taskWorkspaceId(requestParam(req.params.taskId, "taskId"));
  return undefined;
};

export const requireWorkspaceRole = (allowed: WorkspaceRole[]) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const workspaceId = await resolveWorkspaceId(req);
    if (!workspaceId) throw new AppError("Workspace scoped resource not found", 404);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
      select: { role: true }
    });

    if (!membership) throw new AppError("Workspace access denied", 403);
    req.workspaceRole = membership.role;
    if (!allowed.includes(membership.role)) throw new AppError("Insufficient workspace permissions", 403);
    next();
  } catch (error) {
    next(error);
  }
};

export const canManageRole = (actorRole: WorkspaceRole, targetRole: WorkspaceRole, nextRole?: WorkspaceRole) => {
  if (actorRole === "OWNER") return true;
  if (actorRole !== "ADMIN") return false;
  if (targetRole === "OWNER" || nextRole === "OWNER" || nextRole === "ADMIN") return false;
  return rank[targetRole] <= rank.MEMBER;
};
