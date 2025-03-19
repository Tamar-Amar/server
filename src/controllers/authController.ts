import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Operator from '../models/Operator';

export const logAuth = async (req: Request, res: Response): Promise<void> => {
  const { id, password } = req.body;
  try {
    const isAdmin = id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD;

    if (isAdmin) {
      const adminToken = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '20d' });
      res.status(200).json({ message: 'כניסה מוצלחת', token: adminToken, role: 'admin' });
      return;
    }

    const operator = await Operator.findOne({ id });

    if (!operator) {
      res.status(404).json({ message: 'מפעיל לא נמצא' });
      return;
    }

    if (operator.password !== password) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return;
    }

    if(operator.isActive=== false){
      res.status(401).json({ message: 'המפעיל לא פעיל' });
      return;
    }

    const token = jwt.sign({ id: operator._id, role: 'operator' }, process.env.JWT_SECRET as string, { expiresIn: '20d' });
    res.status(200).json({ message: 'כניסה מוצלחת', token, role: 'operator' });
  } 
  
  catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};
