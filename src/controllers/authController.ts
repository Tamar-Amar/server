import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Operator from '../models/Operator';
export const logAuth = async (req: Request, res: Response): Promise<void> => {
  const { id, password } = req.body;

  try {
    // בדיקת "מצב מנהל"
    const isAdmin = id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD;
    if (isAdmin) {
      // יצירת טוקן למנהל
      const adminToken = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
      res.status(200).json({ message: 'כניסה מוצלחת', token: adminToken, role: 'admin' });
      return;
    }

    // חיפוש המפעיל במסד הנתונים
    const operator = await Operator.findOne({ id });

    if (!operator) {
      res.status(404).json({ message: 'מפעיל לא נמצא' });
      return;
    }

    // בדיקת סיסמה
    if (operator.password !== password) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return;
    }

    // יצירת טוקן למפעיל רגיל
    const token = jwt.sign({ id: operator._id, role: 'operator' }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    res.status(200).json({ message: 'כניסה מוצלחת', token, role: 'operator' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};
