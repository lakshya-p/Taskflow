import { WorkspaceRole } from "@prisma/client";
import { prisma } from "../../config/db";

const workspaceSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  members: { select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } } },
  _count: { select: { projects: true, members: true } }
};

export const workspacesRepository = {
  createWithOwner(data: { name: string; description?: string; userId: string }) {
    return prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        members: { create: { userId: data.userId, role: WorkspaceRole.OWNER } }
      },
      select: workspaceSelect
    });
  },
  listForUser(userId: string, skip: number, take: number) {
    const where = { members: { some: { userId } } };
    return prisma.$transaction([
      prisma.workspace.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: workspaceSelect }),
      prisma.workspace.count({ where })
    ]);
  },
  findById(id: string) {
    return prisma.workspace.findUnique({ where: { id }, select: workspaceSelect });
  },
  update(id: string, data: { name?: string; description?: string | null }) {
    return prisma.workspace.update({ where: { id }, data, select: workspaceSelect });
  },
  delete(id: string) {
    return prisma.workspace.delete({ where: { id } });
  }
};
