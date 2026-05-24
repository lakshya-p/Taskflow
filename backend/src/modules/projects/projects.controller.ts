import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { projectsService } from "./projects.service";

export const projectsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.create(req.user!.id, requestParam(req.params.workspaceId, "workspaceId"), req.body);
    sendSuccess(res, 201, "Project created successfully", { project });
  }),
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectsService.list(requestParam(req.params.workspaceId, "workspaceId"), req.query);
    sendSuccess(res, 200, "Projects retrieved", data);
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.get(requestParam(req.params.projectId, "projectId"));
    sendSuccess(res, 200, "Project retrieved", { project });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const project = await projectsService.update(req.user!.id, requestParam(req.params.projectId, "projectId"), req.body);
    sendSuccess(res, 200, "Project updated successfully", { project });
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await projectsService.delete(req.user!.id, requestParam(req.params.projectId, "projectId"));
    sendSuccess(res, 200, "Project deleted successfully");
  })
};
