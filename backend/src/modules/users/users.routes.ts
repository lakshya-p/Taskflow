import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { usersController } from "./users.controller";
import { updateMeSchema, userIdSchema } from "./users.validation";

export const usersRoutes = Router();

usersRoutes.use(requireAuth);
usersRoutes.get("/me", usersController.me);
usersRoutes.patch("/me", validate(updateMeSchema), usersController.updateMe);
usersRoutes.get("/:id", validate(userIdSchema), usersController.get);
