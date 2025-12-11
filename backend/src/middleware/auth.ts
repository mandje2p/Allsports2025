import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

/**
 * Authentication middleware that verifies Firebase ID tokens
 * Requires Authorization header: Bearer <idToken>
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Bearer <idToken>',
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    // Verify the ID token with Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired. Please refresh your token.',
      });
      return;
    }

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate',
    });
  }
};

