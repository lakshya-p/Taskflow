import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { tasksService } from "./tasks.service";

export const tasksController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.create(req.user!.id, requestParam(req.params.projectId, "projectId"), req.body);
    sendSuccess(res, 201, "Task created successfully", { task });
  }),
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await tasksService.list(requestParam(req.params.projectId, "projectId"), req.query);
    sendSuccess(res, 200, "Tasks retrieved", data);
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.get(requestParam(req.params.taskId, "taskId"));
    sendSuccess(res, 200, "Task retrieved", { task });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.update(req.user!.id, requestParam(req.params.taskId, "taskId"), req.body);
    sendSuccess(res, 200, "Task updated successfully", { task });
  }),
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.updateStatus(req.user!.id, requestParam(req.params.taskId, "taskId"), req.body.status);
    sendSuccess(res, 200, "Task status updated", { task });
  }),
  assign: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.assign(req.user!.id, requestParam(req.params.taskId, "taskId"), req.body.assignedTo);
    sendSuccess(res, 200, "Task assignment updated", { task });
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await tasksService.delete(req.user!.id, requestParam(req.params.taskId, "taskId"));
    sendSuccess(res, 200, "Task deleted successfully");
  })
};
