import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ms from "ms";
import { ActivityAction, EntityType, OAuthProvider } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { authRepository } from "./auth.repository";
import { activityService } from "../activity/activity.service";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (user: { id: string; email: string }) =>
  jwt.sign({ email: user.email }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN });

const signRefreshToken = (user: { id: string; email: string }) =>
  jwt.sign({ email: user.email }, env.JWT_REFRESH_SECRET, { subject: user.id, expiresIn: env.JWT_REFRESH_EXPIRES_IN });

const refreshExpiresAt = () => new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));

type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
};

const providerConfig = {
  google: {
    provider: OAuthProvider.GOOGLE,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET
  },
  github: {
    provider: OAuthProvider.GITHUB,
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    emailUrl: "https://api.github.com/user/emails",
    scope: "read:user user:email",
    clientId: () => env.GITHUB_CLIENT_ID,
    clientSecret: () => env.GITHUB_CLIENT_SECRET
  }
} as const;

type OAuthProviderSlug = keyof typeof providerConfig;

const callbackUrl = (provider: OAuthProviderSlug) => `${env.OAUTH_REDIRECT_BASE_URL.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;

const createSession = async (user: { id: string; email: string; name: string; createdAt?: Date; updatedAt?: Date }) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt()
  });
  await activityService.create({
    action: ActivityAction.USER_LOGIN,
    entityType: EntityType.USER,
    entityId: user.id,
    userId: user.id,
    workspaceId: null,
    metadata: { email: user.email }
  });
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt }
  };
};

const encodeState = (provider: OAuthProviderSlug) =>
  jwt.sign({ provider, nonce: crypto.randomBytes(16).toString("hex") }, env.JWT_ACCESS_SECRET, { expiresIn: "10m" });

const decodeState = (state: string, provider: OAuthProviderSlug) => {
  try {
    const payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    return payload.provider === provider;
  } catch {
    return false;
  }
};

const ensureProvider = (provider: string): OAuthProviderSlug => {
  if (provider !== "google" && provider !== "github") throw new AppError("Unsupported OAuth provider", 404);
  return provider;
};

const ensureConfigured = (provider: OAuthProviderSlug) => {
  const config = providerConfig[provider];
  if (!config.clientId() || !config.clientSecret()) {
    throw new AppError(`${provider} OAuth is not configured`, 501);
  }
  return config;
};

const exchangeCode = async (provider: OAuthProviderSlug, code: string) => {
  const config = ensureConfigured(provider);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId()!,
      client_secret: config.clientSecret()!,
      code,
      redirect_uri: callbackUrl(provider),
      grant_type: "authorization_code"
    })
  });
  const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new AppError(payload.error_description || payload.error || "OAuth token exchange failed", 401);
  }
  return payload.access_token;
};

const fetchGoogleProfile = async (accessToken: string): Promise<OAuthProfile> => {
  const response = await fetch(providerConfig.google.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const profile = (await response.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!response.ok || !profile.sub || !profile.email || profile.email_verified === false) {
    throw new AppError("Google account email could not be verified", 401);
  }
  return { provider: OAuthProvider.GOOGLE, providerAccountId: profile.sub, email: profile.email.toLowerCase(), name: profile.name || profile.email };
};

const fetchGitHubProfile = async (accessToken: string): Promise<OAuthProfile> => {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "TaskFlow-Platform" };
  const [profileResponse, emailResponse] = await Promise.all([
    fetch(providerConfig.github.profileUrl, { headers }),
    fetch(providerConfig.github.emailUrl, { headers })
  ]);
  const profile = (await profileResponse.json()) as { id?: number; name?: string; login?: string; email?: string };
  const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
  const email = profile.email || emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email;
  if (!profileResponse.ok || !profile.id || !email) throw new AppError("GitHub account email could not be verified", 401);
  return {
    provider: OAuthProvider.GITHUB,
    providerAccountId: String(profile.id),
    email: email.toLowerCase(),
    name: profile.name || profile.login || email
  };
};

const fetchOAuthProfile = async (provider: OAuthProviderSlug, accessToken: string) =>
  provider === "google" ? fetchGoogleProfile(accessToken) : fetchGitHubProfile(accessToken);

const findOrCreateOAuthUser = async (profile: OAuthProfile) => {
  const account = await authRepository.findOAuthAccount(profile.provider, profile.providerAccountId);
  if (account) return account.user;
  const existing = await authRepository.findUserByEmail(profile.email);
  if (existing) {
    await authRepository.linkOAuthAccount(existing.id, profile.provider, profile.providerAccountId, profile.email);
    return existing;
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), env.BCRYPT_SALT_ROUNDS);
  const user = await authRepository.createOAuthUser({ ...profile, passwordHash });
  await activityService.create({
    action: ActivityAction.USER_REGISTERED,
    entityType: EntityType.USER,
    entityId: user.id,
    userId: user.id,
    workspaceId: null,
    metadata: { email: user.email, provider: profile.provider }
  });
  return user;
};

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new AppError("Email is already registered", 409);
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await authRepository.createUser({ name: input.name, email: input.email, passwordHash });
    await activityService.create({
      action: ActivityAction.USER_REGISTERED,
      entityType: EntityType.USER,
      entityId: user.id,
      userId: user.id,
      workspaceId: null,
      metadata: { email: user.email }
    });
    return user;
  },

  async login(input: { email: string; password: string }) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError("Invalid email or password", 401);
    }
    return createSession(user);
  },

  oauthStart(providerInput: string) {
    const provider = ensureProvider(providerInput);
    const config = ensureConfigured(provider);
    const params = new URLSearchParams({
      client_id: config.clientId()!,
      redirect_uri: callbackUrl(provider),
      response_type: "code",
      scope: config.scope,
      state: encodeState(provider),
      prompt: provider === "google" ? "select_account" : ""
    });
    if (provider === "github") params.delete("prompt");
    return `${config.authUrl}?${params.toString()}`;
  },

  async oauthCallback(providerInput: string, code?: string, state?: string) {
    const provider = ensureProvider(providerInput);
    if (!code || !state || !decodeState(state, provider)) throw new AppError("Invalid OAuth callback", 401);
    const accessToken = await exchangeCode(provider, code);
    const profile = await fetchOAuthProfile(provider, accessToken);
    const user = await findOrCreateOAuthUser(profile);
    return createSession(user);
  },

  async refresh(refreshToken: string) {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }
    const stored = await authRepository.findRefreshToken(hashToken(refreshToken));
    if (!stored || stored.expiresAt < new Date()) throw new AppError("Refresh token expired or revoked", 401);
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
    const user = { id: String(payload.sub), email: stored.user.email };
    const nextRefreshToken = signRefreshToken(user);
    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(nextRefreshToken),
      expiresAt: refreshExpiresAt()
    });
    return { accessToken: signAccessToken(user), refreshToken: nextRefreshToken };
  },

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
  },

  me(userId: string) {
    return authRepository.findUserById(userId);
  }
};
