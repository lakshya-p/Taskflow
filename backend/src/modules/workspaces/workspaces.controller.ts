import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { workspacesService } from "./workspaces.service";

export const workspacesController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspacesService.create(req.user!.id, req.body);
    sendSuccess(res, 201, "Workspace created successfully", { workspace });
  }),
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await workspacesService.list(req.user!.id, req.query);
    sendSuccess(res, 200, "Workspaces retrieved", data);
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspacesService.get(requestParam(req.params.workspaceId, "workspaceId"));
    sendSuccess(res, 200, "Workspace retrieved", { workspace });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspacesService.update(req.user!.id, requestParam(req.params.workspaceId, "workspaceId"), req.body);
    sendSuccess(res, 200, "Workspace updated successfully", { workspace });
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await workspacesService.delete(req.user!.id, requestParam(req.params.workspaceId, "workspaceId"));
    sendSuccess(res, 200, "Workspace deleted successfully");
  })
};
