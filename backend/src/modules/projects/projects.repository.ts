import { Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "../../config/db";

const projectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tasks: true } }
};

export const projectsRepository = {
  create(data: { workspaceId: string; name: string; description?: string; status?: ProjectStatus }) {
    return prisma.project.create({ data, select: projectSelect });
  },
  list(workspaceId: string, filters: { status?: ProjectStatus }, skip: number, take: number) {
    const where: Prisma.ProjectWhereInput = { workspaceId, status: filters.status };
    return prisma.$transaction([
      prisma.project.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: projectSelect }),
      prisma.project.count({ where })
    ]);
  },
  findById(id: string) {
    return prisma.project.findUnique({ where: { id }, select: projectSelect });
  },
  update(id: string, data: { name?: string; description?: string | null; status?: ProjectStatus }) {
    return prisma.project.update({ where: { id }, data, select: projectSelect });
  },
  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }
};
