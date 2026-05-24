import { EntityType } from "@prisma/client";
import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { activityService } from "./activity.service";

export const activityController = {
  workspace: asyncHandler(async (req: Request, res: Response) => {
    const data = await activityService.listWorkspace(requestParam(req.params.workspaceId, "workspaceId"), req.query);
    sendSuccess(res, 200, "Workspace activity retrieved", data);
  }),
  project: asyncHandler(async (req: Request, res: Response) => {
    const data = await activityService.listEntity(EntityType.PROJECT, requestParam(req.params.projectId, "projectId"), req.query);
    sendSuccess(res, 200, "Project activity retrieved", data);
  }),
  task: asyncHandler(async (req: Request, res: Response) => {
    const data = await activityService.listEntity(EntityType.TASK, requestParam(req.params.taskId, "taskId"), req.query);
    sendSuccess(res, 200, "Task activity retrieved", data);
  })
};
