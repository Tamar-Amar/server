import { Request, Response } from 'express';
import Class from '../models/Class';
import mongoose from 'mongoose';

//add class
export const addClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, isSpecialEducation, gender, uniqueSymbol, chosenStore, institutionId, type, hasAfternoonCare } = req.body;

    // וידוא ששדות חובה נשלחו
    if (!name || !type ) {
      res.status(400).json({ error: 'Missing required fields: name, type, or hasAfternoonCare' });
      return;
    }

    const newClass = new Class({
      name,
      isSpecialEducation,
      gender,
      uniqueSymbol,
      chosenStore,
      institutionId,
      type,
      hasAfternoonCare: req.body.hasAfternoonCare,
    });

    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

//get all classes by institution id
export const getClassesByInstitutionId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { institutionId } = req.params;

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(institutionId)) {
      res.status(400).json({ error: 'Invalid institutionId format' });
      return;
    }

    const classes = await Class.find({ institutionId });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getAllClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

//delete class by id
export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const classToDelete = await Class.findByIdAndDelete(req.params.id);
    if (!classToDelete) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
