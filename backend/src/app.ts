import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { globalRateLimiter } from "./middlewares/rateLimit.middleware";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { workspacesRoutes } from "./modules/workspaces/workspaces.routes";
import { membersRoutes } from "./modules/members/members.routes";
import { workspaceProjectsRoutes, projectsRoutes } from "./modules/projects/projects.routes";
import { projectTasksRoutes, tasksRoutes } from "./modules/tasks/tasks.routes";
import { activityRoutes } from "./modules/activity/activity.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(globalRateLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "TaskFlow API is healthy", data: { uptime: process.uptime() } });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/workspaces", workspacesRoutes);
app.use("/api/workspaces/:workspaceId/members", membersRoutes);
app.use("/api/workspaces/:workspaceId/projects", workspaceProjectsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/projects/:projectId/tasks", projectTasksRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api", activityRoutes);

app.use(notFound);
app.use(errorHandler);
