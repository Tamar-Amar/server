import Coordinator from '../models/Coordinator';
import { Request, Response } from 'express';

export const getAllCoordinators = async (req: Request, res: Response) => {
  try {
    const coordinators = await Coordinator.find();
    res.json(coordinators);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת רכזים' });
  }
};

export const getCoordinatorById = async (req: Request, res: Response) => {
  try {
    const coordinator = await Coordinator.findById(req.params.id);
    if (!coordinator) return res.status(404).json({ error: 'רכז לא נמצא' });
    res.json(coordinator);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת רכז' });
  }
};

export const createCoordinator = async (req: Request, res: Response) => {
  try {
    const coordinator = new Coordinator(req.body);
    await coordinator.save();
    res.status(201).json(coordinator);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה ביצירת רכז', details: err });
  }
};

export const updateCoordinator = async (req: Request, res: Response) => {
  try {
    const coordinator = await Coordinator.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coordinator) return res.status(404).json({ error: 'רכז לא נמצא' });
    res.json(coordinator);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בעדכון רכז', details: err });
  }
};

export const deleteCoordinator = async (req: Request, res: Response) => {
  try {
    const coordinator = await Coordinator.findByIdAndDelete(req.params.id);
    if (!coordinator) return res.status(404).json({ error: 'רכז לא נמצא' });
    res.json({ message: 'רכז נמחק' });
  } catch (err) {
    res.status(400).json({ error: 'שגיאה במחיקת רכז', details: err });
  }
}; 