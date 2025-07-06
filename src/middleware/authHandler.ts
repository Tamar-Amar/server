import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        idNumber?: string;
        username?: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'לא נמצא טוקן הזדהות' });
    return;
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: string;
      role: string;
      idNumber?: string;
      username?: string;
    };
    
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: 'טוקן לא תקין' });
    return;
  }
};
