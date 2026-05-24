import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireWorkspaceRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { membersController } from "./members.controller";
import { inviteMemberSchema, listMembersSchema, memberIdSchema, memberRoleSchema } from "./members.validation";

export const membersRoutes = Router({ mergeParams: true });

membersRoutes.use(requireAuth);
membersRoutes.post("/invite", validate(inviteMemberSchema), requireWorkspaceRole(["OWNER", "ADMIN"]), membersController.invite);
membersRoutes.get("/", validate(listMembersSchema), requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), membersController.list);
membersRoutes.patch("/:memberId/role", validate(memberRoleSchema), requireWorkspaceRole(["OWNER", "ADMIN"]), membersController.updateRole);
membersRoutes.delete("/:memberId", validate(memberIdSchema), requireWorkspaceRole(["OWNER", "ADMIN"]), membersController.remove);
