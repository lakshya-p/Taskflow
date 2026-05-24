import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validation";
import { requireAuth } from "../../middlewares/auth.middleware";
import { loginRateLimiter } from "../../middlewares/rateLimit.middleware";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), authController.register);
authRoutes.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
authRoutes.post("/refresh-token", validate(refreshSchema), authController.refresh);
authRoutes.post("/logout", validate(logoutSchema), authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.get("/oauth/:provider", authController.oauthStart);
authRoutes.get("/oauth/:provider/callback", authController.oauthCallback);
