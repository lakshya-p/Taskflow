import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { requestParam } from "../../utils/requestParam";
import { membersService } from "./members.service";

export const membersController = {
  invite: asyncHandler(async (req: Request, res: Response) => {
    const member = await membersService.invite(req.user!.id, req.workspaceRole!, requestParam(req.params.workspaceId, "workspaceId"), req.body);
    sendSuccess(res, 201, "Member added successfully", { member });
  }),
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await membersService.list(requestParam(req.params.workspaceId, "workspaceId"), req.query);
    sendSuccess(res, 200, "Members retrieved", data);
  }),
  updateRole: asyncHandler(async (req: Request, res: Response) => {
    const member = await membersService.updateRole(
      req.user!.id,
      req.workspaceRole!,
      requestParam(req.params.workspaceId, "workspaceId"),
      requestParam(req.params.memberId, "memberId"),
      req.body.role
    );
    sendSuccess(res, 200, "Member role updated", { member });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await membersService.remove(
      req.user!.id,
      req.workspaceRole!,
      requestParam(req.params.workspaceId, "workspaceId"),
      requestParam(req.params.memberId, "memberId")
    );
    sendSuccess(res, 200, "Member removed");
  })
};
