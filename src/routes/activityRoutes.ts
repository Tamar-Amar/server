import express from 'express';
import { addActivity, deleteActivity, getActivitiesByClass, getActivitiesByOperator, getAllActivities, updateActivity} from '../controllers/activityController';
import Activity from '../models/Activity';
import { uploadActivitiesToGoogleSheet } from '../utils/uploadActivitiesToGoogleSheet';

const router = express.Router();

router.post('/', addActivity); 
router.get('/actByCls/:classId', getActivitiesByClass);
router.get('/actByOp/:operatorId', getActivitiesByOperator); 
router.get('/', getAllActivities);
router.put('/activity', updateActivity);
router.delete('/:id', deleteActivity);

router.post('/export-to-sheets', async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('classId', 'uniqueSymbol name')
      .populate('operatorId', 'firstName lastName')
      .lean();

    await uploadActivitiesToGoogleSheet(activities as any);

    res.status(200).json({ message: 'דוח נשלח לגיליון בהצלחה' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'אירעה שגיאה בעת שליחת הדוח' });
  }
});

export default router;
