import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Operator from '../models/Operator';

export const logAouth = async (req: Request, res: Response): Promise<void> => {
  const { id, password } = req.body;

  try {
    // חיפוש המפעיל במסד הנתונים לפי תעודת זהות
    const operator = await Operator.findOne({ id });

    if (!operator) {
      res.status(404).json({ message: 'מפעיל לא נמצא' });
      return ;
    }

    // בדיקת סיסמה
    if (operator.password !== password) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return ;
    }

    // יצירת טוקן JWT
    const token = jwt.sign({ id: operator._id }, 'secret_key', { expiresIn: '1h' });

    // שליחת תגובה עם טוקן
    res.status(200).json({ message: 'כניסה מוצלחת', token });
    return ;
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
    return ;
  }
};
