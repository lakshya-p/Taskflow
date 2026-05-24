import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireWorkspaceRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { tasksController } from "./tasks.controller";
import { assignTaskSchema, createTaskSchema, listTasksSchema, taskIdSchema, updateTaskSchema, updateTaskStatusSchema } from "./tasks.validation";

export const projectTasksRoutes = Router({ mergeParams: true });
export const tasksRoutes = Router();

projectTasksRoutes.use(requireAuth);
projectTasksRoutes.post("/", validate(createTaskSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), tasksController.create);
projectTasksRoutes.get("/", validate(listTasksSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), tasksController.list);

tasksRoutes.use(requireAuth);
tasksRoutes.get("/:taskId", validate(taskIdSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), tasksController.get);
tasksRoutes.patch("/:taskId", validate(updateTaskSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), tasksController.update);
tasksRoutes.delete("/:taskId", validate(taskIdSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), tasksController.delete);
tasksRoutes.patch("/:taskId/status", validate(updateTaskStatusSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), tasksController.updateStatus);
tasksRoutes.patch("/:taskId/assign", validate(assignTaskSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), tasksController.assign);
