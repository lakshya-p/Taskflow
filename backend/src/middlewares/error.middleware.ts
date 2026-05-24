import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";
import { logger } from "../utils/logger";

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ error }, error.message);

  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, error.errors ?? []);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return sendError(res, 409, "Resource already exists");
    if (error.code === "P2025") return sendError(res, 404, "Resource not found");
  }

  const errors = env.NODE_ENV === "production" ? [] : [{ stack: error.stack }];
  return sendError(res, 500, "Internal Server Error", errors);
};
