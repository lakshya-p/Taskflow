import { ActivityAction, EntityType, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export const activityRepository = {
  create(data: {
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    userId?: string | null;
    workspaceId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.activityLog.create({ data });
  },

  findByWorkspace(workspaceId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.activityLog.findMany({
        where: { workspaceId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      prisma.activityLog.count({ where: { workspaceId } })
    ]);
  },

  findByEntity(entityType: EntityType, entityId: string, skip: number, take: number) {
    return prisma.$transaction([
      prisma.activityLog.findMany({
        where: { entityType, entityId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      prisma.activityLog.count({ where: { entityType, entityId } })
    ]);
  }
};
