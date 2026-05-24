import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { authService } from "./auth.service";
import { env } from "../../config/env";
import { requestParam } from "../../utils/requestParam";

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    sendSuccess(res, 201, "User registered successfully", { user });
  }),
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.login(req.body);
    sendSuccess(res, 200, "Login successful", data);
  }),
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, 200, "Token refreshed successfully", data);
  }),
  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, 200, "Logout successful");
  }),
  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    sendSuccess(res, 200, "Current user retrieved", { user });
  }),
  oauthStart: asyncHandler(async (req: Request, res: Response) => {
    res.redirect(authService.oauthStart(requestParam(req.params.provider, "provider")));
  }),
  oauthCallback: asyncHandler(async (req: Request, res: Response) => {
    const provider = requestParam(req.params.provider, "provider");
    const data = await authService.oauthCallback(
      provider,
      typeof req.query.code === "string" ? req.query.code : undefined,
      typeof req.query.state === "string" ? req.query.state : undefined
    );
    const redirectUrl = new URL(env.FRONTEND_URL);
    redirectUrl.searchParams.set("accessToken", data.accessToken);
    redirectUrl.searchParams.set("refreshToken", data.refreshToken);
    redirectUrl.searchParams.set("authProvider", provider);
    res.redirect(redirectUrl.toString());
  })
};
