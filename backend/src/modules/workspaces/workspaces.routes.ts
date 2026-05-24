import { Router } from "express";
import { WorkspaceRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireWorkspaceRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { workspacesController } from "./workspaces.controller";
import { createWorkspaceSchema, getWorkspaceSchema, listWorkspacesSchema, updateWorkspaceSchema } from "./workspaces.validation";

export const workspacesRoutes = Router();

workspacesRoutes.use(requireAuth);
workspacesRoutes.post("/", validate(createWorkspaceSchema), workspacesController.create);
workspacesRoutes.get("/", validate(listWorkspacesSchema), workspacesController.list);
workspacesRoutes.get("/:workspaceId", validate(getWorkspaceSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), workspacesController.get);
workspacesRoutes.patch("/:workspaceId", validate(updateWorkspaceSchema), requireWorkspaceRole(["OWNER", "ADMIN"]), workspacesController.update);
workspacesRoutes.delete("/:workspaceId", validate(getWorkspaceSchema), requireWorkspaceRole([WorkspaceRole.OWNER]), workspacesController.delete);
