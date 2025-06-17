import { Request, Response } from 'express';
import Activity from '../models/Activity';



export const addActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, operatorId, date, description,monthPayment } = req.body;
    if (!classId || !operatorId || !date) {
      res.status(400).json({ error: "Missing required fields: classId, operatorId, or date" });
      return;
    }

    const activityDate = new Date(date); 
      const existingActivity = await Activity.findOne({
        classId,
        operatorId,
        date: activityDate 
      })
      .populate("classId", "name uniqueSymbol")
      .populate("operatorId", "firstName lastName");



    if (existingActivity!=null){
      res.status(200).json({
        message: "כבר קיימת פעילות זהה",
        existingActivity,
      });
      return;
    }

    const newActivity = new Activity({ classId, operatorId, date: activityDate, description ,monthPayment});
    await newActivity.save();

    res.status(201).json(newActivity);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


export const getActivitiesByClass = async (req: Request, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const activities = await Activity.find({ classId })
        .populate('operatorId', 'firstName lastName')
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
        .populate('classId', 'name uniqueSymbol')
        .populate('operatorId', 'firstName lastName'); 
  
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
  

export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activityId, activity } = req.body;

    if (!activityId || !activity) {
      res.status(400).json({ error: 'Activity ID and activity data are required' });
      return;
    }

    const updatedActivity = await Activity.findByIdAndUpdate(
      activityId,
      { $set: activity },
      { new: true, runValidators: true }
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

export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedActivity = await Activity.findByIdAndDelete(id);

    if (!deletedActivity) {
      res.status(404).json({ error: 'פעילות לא נמצאה' });
      return;
    }

    res.status(200).json({
      operatorId: deletedActivity.operatorId,
      activityId: deletedActivity._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
};
