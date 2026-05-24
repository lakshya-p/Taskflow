process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.DATABASE_URL ||= "postgresql://taskflow:taskflow@localhost:5432/taskflow_test";
process.env.REDIS_URL ||= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-enough-length";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-enough-length";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX = "1000";
process.env.OAUTH_REDIRECT_BASE_URL = "http://localhost:5001";
process.env.FRONTEND_URL = "http://localhost:3000";

import { prisma } from "../src/config/db";
import { closeRedis } from "../src/config/redis";

beforeEach(async () => {
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await closeRedis();
  await prisma.$disconnect();
});
