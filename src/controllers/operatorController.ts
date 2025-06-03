import { Request, Response } from 'express';
import Operator from '../models/Operator';
import BankDetails from '../models/BankDetails';
import jwt from 'jsonwebtoken';
import Class from '../models/Class';

export const addOperator = async (req: Request, res: Response): Promise<void> => {
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
      bankDetails, 
      gender, 
      educationType,
      regularClasses 
    } = req.body;

    if (!firstName || !phone || !description || !paymentMethod ||  !id || !password || !gender || !educationType) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const operatorAddress = address || "לא התקבלו פרטים";
    const operatorBusinessDetails = businessDetails || { businessId: "לא התקבלו פרטים", businessName: "לא התקבלו פרטים" };

    const newBankDetails = new BankDetails({
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      branchNumber: bankDetails.branchNumber,
    });

    await newBankDetails.save();

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
      status,
      businessDetails: paymentMethod === "חשבונית" ? operatorBusinessDetails : undefined,
      bankDetailsId: newBankDetails._id, 
      signDate: new Date(),
      gender,
      educationType,
      regularClasses: regularClasses || [],
    });

    const savedOperator = await newOperator.save();

    res.status(201).json({
      ...savedOperator.toObject(),
      _id: savedOperator._id
    });
  } catch (err) {
    console.error('Error adding operator:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};


export const getOperators = async (req: Request, res: Response): Promise<void> => {
  try {
    const operators = await Operator.find({ isActive: true }).populate("bankDetailsId");
    res.json(operators);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


export const deleteOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = req.params.id;

    const operator = await Operator.findById(operatorId)

    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    await Operator.findByIdAndDelete(operatorId);

    
    await Class.updateMany(
      { regularOperatorId: operatorId }, 
      { regularOperatorId: null} 
    );

    res.status(200).json({ message: 'Operator deactivated successfully, and classes updated' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


export const updateOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const operatorId = req.params.id;
    const updatedData = req.body;

    const updatedOperator = await Operator.findByIdAndUpdate(
      operatorId,
      { ...updatedData },
      { new: true, runValidators: true } 
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

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string, role: string };

    if (!decoded.id) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    const operator = await Operator.findById(decoded.id).populate("bankDetailsId");
    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    res.status(200).json(operator);
  } catch (err: any) {
    console.error("getCurrentOperator error:", err);
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: "Token expired" });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};


export const getOperatorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const operator = await Operator.findById(id)
    .populate("bankDetailsId")
    .populate({
      path: "regularClasses",
      select: "name uniqueSymbol", 
    });

    if (!operator) {
      res.status(404).json({ error: "Operator not found" });
      return;
    }

    res.status(200).json(operator);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateOperatorWeeklySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { weeklySchedule } = req.body; 

    if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
      res.status(400).json({ error: "Invalid weeklySchedule format" });
      return;
    }

    const updatedOperator = await Operator.findByIdAndUpdate(
      id,
      { weeklySchedule },
      { new: true, runValidators: true } 
    );

    if (!updatedOperator) {
      res.status(404).json({ error: "Operator not found" });
      return;
    }

    res.status(200).json(updatedOperator);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};