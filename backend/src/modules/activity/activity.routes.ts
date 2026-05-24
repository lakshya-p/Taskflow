import { Router } from "express";
import { WorkspaceRole } from "@prisma/client";
import { activityController } from "./activity.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireWorkspaceRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { activityQuerySchema } from "./activity.validation";

export const activityRoutes = Router();

const readRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

activityRoutes.get(
  "/workspaces/:workspaceId/activity",
  requireAuth,
  requireWorkspaceRole(readRoles),
  validate(activityQuerySchema),
  activityController.workspace
);
activityRoutes.get(
  "/projects/:projectId/activity",
  requireAuth,
  requireWorkspaceRole(readRoles),
  validate(activityQuerySchema),
  activityController.project
);
activityRoutes.get(
  "/tasks/:taskId/activity",
  requireAuth,
  requireWorkspaceRole(readRoles),
  validate(activityQuerySchema),
  activityController.task
);
