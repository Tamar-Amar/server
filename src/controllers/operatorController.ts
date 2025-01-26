import { Request, Response } from 'express';
import Operator from '../models/Operator';

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
