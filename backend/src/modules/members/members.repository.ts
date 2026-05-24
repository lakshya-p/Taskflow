import { WorkspaceRole } from "@prisma/client";
import { prisma } from "../../config/db";

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } }
};

export const membersRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  },
  findMember(id: string) {
    return prisma.workspaceMember.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true } } } });
  },
  findByWorkspaceUser(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  },
  create(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.create({ data: { workspaceId, userId, role }, select: memberSelect });
  },
  list(workspaceId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.workspaceMember.findMany({ where: { workspaceId }, skip, take, orderBy: { createdAt: "asc" }, select: memberSelect }),
      prisma.workspaceMember.count({ where: { workspaceId } })
    ]);
  },
  updateRole(id: string, role: WorkspaceRole) {
    return prisma.workspaceMember.update({ where: { id }, data: { role }, select: memberSelect });
  },
  delete(id: string) {
    return prisma.workspaceMember.delete({ where: { id } });
  },
  ownerCount(workspaceId: string) {
    return prisma.workspaceMember.count({ where: { workspaceId, role: WorkspaceRole.OWNER } });
  }
};
