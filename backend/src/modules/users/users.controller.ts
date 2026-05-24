import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { usersService } from "./users.service";

export const usersController = {
  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.get(req.user!.id);
    sendSuccess(res, 200, "Profile retrieved", { user });
  }),
  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.updateMe(req.user!.id, req.body);
    sendSuccess(res, 200, "Profile updated", { user });
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.get(requestParam(req.params.id, "id"));
    sendSuccess(res, 200, "User retrieved", { user });
  })
};
