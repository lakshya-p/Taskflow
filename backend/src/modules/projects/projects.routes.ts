import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireWorkspaceRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { projectsController } from "./projects.controller";
import { createProjectSchema, listProjectsSchema, projectIdSchema, updateProjectSchema } from "./projects.validation";

export const workspaceProjectsRoutes = Router({ mergeParams: true });
export const projectsRoutes = Router();

workspaceProjectsRoutes.use(requireAuth);
workspaceProjectsRoutes.post("/", validate(createProjectSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), projectsController.create);
workspaceProjectsRoutes.get("/", validate(listProjectsSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), projectsController.list);

projectsRoutes.use(requireAuth);
projectsRoutes.get("/:projectId", validate(projectIdSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), projectsController.get);
projectsRoutes.patch("/:projectId", validate(updateProjectSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), projectsController.update);
projectsRoutes.delete("/:projectId", validate(projectIdSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), projectsController.delete);
