import { Request, Response, NextFunction } from 'express';
import userService from '../services/UserService';
import { UnauthorizedError } from '../utils/errors';

/**
 * Extend Express Request with user info
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

/**
 * Auth middleware to verify JWT token
 */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = userService.verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = userService.verifyToken(token);

      if (decoded) {
        req.userId = decoded.userId;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Default export for compatibility
 */
export default authMiddleware;

/**
 * Alias for auth middleware
 */
export const authenticate = authMiddleware;

/**
 * Middleware to require specific role
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const user = await require('../services/UserService').default.getUserById(req.userId);
      if (!roles.includes(user.role)) {
        throw new UnauthorizedError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
