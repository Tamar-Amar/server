import { Request, Response } from 'express';
import Class from '../models/Class';
import mongoose from 'mongoose';

export const addClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, education, gender, address, uniqueSymbol, chosenStore, institutionName, institutionCode, type, hasAfternoonCare, monthlyBudget, childresAmount, AfternoonOpenDate, description, regularOperatorId, workerAfterNoonId1, workerAfterNoonId2  } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Missing required fields: name, type' });
      return;
    }

    const existingClass = await Class.findOne({ uniqueSymbol });

    if (existingClass) {
      res.status(400).json({ error: 'Class with this uniqueSymbol already exists' });
      return;
    }

    const newClass = new Class({
      name,
      education,
      gender,
      address,
      uniqueSymbol,
      chosenStore,
      institutionName,
      institutionCode,  
      workerAfterNoonId1,
      workerAfterNoonId2,
      type,
      hasAfternoonCare,
      monthlyBudget,
      childresAmount,
      AfternoonOpenDate,
      description,
      regularOperatorId: regularOperatorId || null, 
      isActive: true, 
    });

    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getAllClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const classes = await Class.find({ isActive: true });
    console.log("classes from controller", classes);
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const classToDelete = await Class.findOne({ _id: req.params.id, isActive: true });

    if (!classToDelete) {
      res.status(404).json({ error: 'Class not found or already deactivated' });
      return;
    }
    
    await Class.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.status(200).json({ message: 'Class deactivated successfully' });

  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log("updateData", updateData);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid class ID format' });
      return;
    }

    const updatedClass = await Class.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedClass) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.status(200).json(updatedClass);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};
