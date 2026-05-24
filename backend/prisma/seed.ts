import bcrypt from "bcryptjs";
import { ActivityAction, EntityType, PrismaClient, ProjectStatus, TaskPriority, TaskStatus, WorkspaceRole } from "@prisma/client";

const prisma = new PrismaClient();

const password = "DemoPass123!";

async function upsertUser(name: string, email: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10)
    }
  });
}

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.refreshToken.deleteMany();

  const owner = await upsertUser("Aarav Owner", "owner@taskflow.dev");
  const admin = await upsertUser("Maya Admin", "admin@taskflow.dev");
  const viewer = await upsertUser("Neel Viewer", "viewer@taskflow.dev");

  const product = await prisma.workspace.create({
    data: {
      name: "Product Engineering",
      description: "Roadmap, delivery, and backend platform work.",
      members: {
        create: [
          { userId: owner.id, role: WorkspaceRole.OWNER },
          { userId: admin.id, role: WorkspaceRole.ADMIN },
          { userId: viewer.id, role: WorkspaceRole.VIEWER }
        ]
      }
    }
  });

  const ops = await prisma.workspace.create({
    data: {
      name: "Operations",
      description: "Internal workflow automation and reporting.",
      members: {
        create: [
          { userId: owner.id, role: WorkspaceRole.OWNER },
          { userId: admin.id, role: WorkspaceRole.MEMBER }
        ]
      }
    }
  });

  const apiProject = await prisma.project.create({
    data: { name: "API Modernization", description: "RBAC-first REST API platform.", status: ProjectStatus.ACTIVE, workspaceId: product.id }
  });
  const cacheProject = await prisma.project.create({
    data: { name: "Caching Rollout", description: "Redis-backed detail caches and invalidation.", status: ProjectStatus.PLANNED, workspaceId: product.id }
  });
  const reportingProject = await prisma.project.create({
    data: { name: "Ops Reporting", description: "Operational dashboards and activity exports.", status: ProjectStatus.ACTIVE, workspaceId: ops.id }
  });

  const tasks = [
    { title: "Implement auth refresh rotation", status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH, projectId: apiProject.id, assignedTo: admin.id },
    { title: "Add workspace activity endpoint", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, projectId: apiProject.id, assignedTo: owner.id },
    { title: "Benchmark task detail cache", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT, projectId: cacheProject.id, assignedTo: admin.id },
    { title: "Design project status filters", status: TaskStatus.TODO, priority: TaskPriority.LOW, projectId: cacheProject.id, assignedTo: null },
    { title: "Create weekly ops report task flow", status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH, projectId: reportingProject.id, assignedTo: admin.id }
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        description: `${task.title} for the TaskFlow demo dataset.`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: owner.id
      }
    });
  }

  for (const workspace of [product, ops]) {
    await prisma.activityLog.createMany({
      data: [
        {
          action: ActivityAction.WORKSPACE_CREATED,
          entityType: EntityType.WORKSPACE,
          entityId: workspace.id,
          userId: owner.id,
          workspaceId: workspace.id,
          metadata: { name: workspace.name }
        },
        {
          action: ActivityAction.MEMBER_ADDED,
          entityType: EntityType.MEMBER,
          entityId: workspace.id,
          userId: owner.id,
          workspaceId: workspace.id,
          metadata: { seeded: true }
        }
      ]
    });
  }

  console.log("Seed complete. Demo password for all users:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
