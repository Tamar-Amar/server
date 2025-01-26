import { Request, Response } from 'express';
import Activity from '../models/Activity';

// יצירת פעילות חדשה
export const addActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { classId, operatorId, date, description } = req.body;
  
      if (!classId || !operatorId || !date) {
        res.status(400).json({ error: 'Missing required fields: classId, operatorId, or date' });
        return;
      }
  
      const newActivity = new Activity({
        classId,
        operatorId,
        date,
        description,
      });
  
      await newActivity.save();
      res.status(201).json(newActivity);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

// קבלת כל הפעילויות לכיתה מסוימת
export const getActivitiesByClass = async (req: Request, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const activities = await Activity.find({ classId })
        .populate('operatorId', 'name phone') // משיכת פרטים של המפעיל
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
  

export const getActivitiesByOperator = async (req: Request, res: Response): Promise<void> => {
    try {
      const { operatorId } = req.params;
      const activities = await Activity.find({ operatorId })
      .populate('classId', 'name uniqueSymbol');
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };

  export const getAllActivities = async (req: Request, res: Response): Promise<void> => {
    try {
      const activities = await Activity.find()
        .populate('classId', 'name uniqueSymbol') // משיכת שם הכיתה והסמל שלה
        .populate('operatorId', 'firstName lastName'); // משיכת שם המפעיל
  
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
  

// עדכון נוכחות לפעילות
export const updatePresence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activityId, presence } = req.body;

    if (!activityId || !presence) {
      res.status(400).json({ error: 'Activity ID and presence data are required' });
      return;
    }

    const updatedActivity = await Activity.findByIdAndUpdate(
      activityId,
      { $push: { presence } },
      { new: true }
    );

    if (!updatedActivity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.status(200).json(updatedActivity);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
