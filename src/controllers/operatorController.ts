import { Request, Response } from 'express';
import Operator from '../models/Operator';
import jwt from 'jsonwebtoken';
// הוספת מפעיל חדש
export const addOperator = async (req: Request, res: Response): Promise<void> => {
  console.log(req.body);
  try {
    const { 
      firstName, 
      lastName, 
      id, 
      status, 
      email, 
      password, 
      phone, 
      address, 
      description, 
      paymentMethod, 
      businessDetails, 
      bankDetails } = req.body;

    if (!firstName || !phone || !description || !paymentMethod || !bankDetails || !id || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // if (paymentMethod === 'חשבונית' && !businessDetails) {
    //   res.status(400).json({ error: 'Business details are required for payment method "חשבונית"' });
    //   return;
    // }

    const operatorAddress = address || "לא התקבלו פרטים";
    const operatorBusinessDetails = businessDetails || { businessId: "לא התקבלו פרטים", businessName: "לא התקבלו פרטים" };



    const newOperator = new Operator({
      firstName,
      lastName,
      email,
      phone,
      address: operatorAddress,
      id,
      password,
      description,
      paymentMethod,
      businessDetails: paymentMethod === 'חשבונית' ? operatorBusinessDetails : undefined,
      bankDetails,
      signDate: new Date(),
    });

    await newOperator.save();
    res.status(201).json(newOperator);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

// קבלת כל המפעילים
export const getOperators = async (req: Request, res: Response): Promise<void> => {
  try {
    const operators = await Operator.find();
    res.json(operators);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// מחיקת מפעיל
export const deleteOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const operator = await Operator.findByIdAndDelete(req.params.id);
    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// עריכת מפעיל
export const updateOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = req.params.id;
    const updatedData = req.body;

    const updatedOperator = await Operator.findByIdAndUpdate(
      operatorId,
      { ...updatedData },
      { new: true, runValidators: true } // מחזיר את המסמך המעודכן ומבצע ולידציה
    );

    if (!updatedOperator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    res.status(200).json(updatedOperator);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getCurrentOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization header' });
      return;
    }

    // שליפת הטוקן מתוך ה-Authorization Header
    const token = authHeader.split(' ')[1];

    // אימות הטוקן
    const decoded: any = jwt.verify(token, 'secret_key'); // החלף את 'secret_key' במפתח שלך

    // חיפוש המפעיל לפי ה-ID שנמצא בטוקן
    const operator = await Operator.findById(decoded.id);

    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    res.status(200).json(operator); // החזרת נתוני המפעיל
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
