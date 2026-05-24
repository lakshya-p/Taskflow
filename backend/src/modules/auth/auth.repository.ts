import { prisma } from "../../config/db";
import { OAuthProvider } from "@prisma/client";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
  },
  createUser(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({
      data,
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
    });
  },
  findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
    return prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true }
    });
  },
  createOAuthUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    provider: OAuthProvider;
    providerAccountId: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        oauthAccounts: {
          create: {
            provider: data.provider,
            providerAccountId: data.providerAccountId,
            email: data.email
          }
        }
      }
    });
  },
  linkOAuthAccount(userId: string, provider: OAuthProvider, providerAccountId: string, email: string) {
    return prisma.oAuthAccount.create({
      data: { userId, provider, providerAccountId, email },
      include: { user: true }
    });
  },
  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },
  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({ where: { tokenHash, revokedAt: null }, include: { user: true } });
  },
  revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }
};
