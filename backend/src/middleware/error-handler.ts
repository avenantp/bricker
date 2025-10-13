/**
 * Error Handling Middleware
 * Centralized error handling for all API routes
 */

import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Create an API error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Common error types
 */
export const ErrorTypes = {
  ValidationError: (message: string, details?: any) =>
    createError(message, 400, 'VALIDATION_ERROR', details),
  NotFoundError: (resource: string) =>
    createError(`${resource} not found`, 404, 'NOT_FOUND'),
  UnauthorizedError: (message: string = 'Unauthorized') =>
    createError(message, 401, 'UNAUTHORIZED'),
  ForbiddenError: (message: string = 'Forbidden') =>
    createError(message, 403, 'FORBIDDEN'),
  ConflictError: (message: string) => createError(message, 409, 'CONFLICT'),
  GitSyncError: (message: string, details?: any) =>
    createError(message, 500, 'GIT_SYNC_ERROR', details),
  DatabaseError: (message: string, details?: any) =>
    createError(message, 500, 'DATABASE_ERROR', details),
};

/**
 * Error handling middleware
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  console.error(`[Error Handler] ${errorCode}: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack,
    details: err.details,
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message,
      code: errorCode,
      statusCode,
      details: err.details || undefined,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error middleware
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation middleware
 */
export function validateRequest(schema: {
  body?: any;
  params?: any;
  query?: any;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const [key, required] of Object.entries(schema.body)) {
        if (required && !req.body[key]) {
          errors.push(`Missing required field: ${key}`);
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const [key, required] of Object.entries(schema.params)) {
        if (required && !req.params[key]) {
          errors.push(`Missing required parameter: ${key}`);
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [key, required] of Object.entries(schema.query)) {
        if (required && !req.query[key]) {
          errors.push(`Missing required query parameter: ${key}`);
        }
      }
    }

    if (errors.length > 0) {
      return next(
        ErrorTypes.ValidationError('Validation failed', { errors })
      );
    }

    next();
  };
}
