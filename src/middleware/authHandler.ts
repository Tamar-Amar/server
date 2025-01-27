import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'אין טוקן גישה' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as { id: string; role: string };
    req.body.role = decoded.role; // שמירת התפקיד
    req.body.userId = decoded.id; // שמירת מזהה המשתמש
    next();
  } catch (error) {
    res.status(403).json({ message: 'טוקן לא תקף' });
  }
};
