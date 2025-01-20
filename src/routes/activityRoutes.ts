import express from 'express';
import { addActivity, getActivitiesByClass, getActivitiesByOperator, getAllActivities, updatePresence } from '../controllers/activityController';

const router = express.Router();

router.post('/', addActivity); 
router.get('/actByCls/:classId', getActivitiesByClass);
router.get('/actByOp/:operatorId', getActivitiesByOperator); 
router.get('/', getAllActivities);
router.put('/presence', updatePresence);

export default router;
