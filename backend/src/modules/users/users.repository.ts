import { prisma } from "../../config/db";

const publicSelect = { id: true, name: true, email: true, createdAt: true, updatedAt: true };

export const usersRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicSelect });
  },
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: publicSelect });
  },
  update(id: string, data: { name?: string; email?: string }) {
    return prisma.user.update({ where: { id }, data, select: publicSelect });
  }
};
