import express from 'express';
import { addActivity, deleteActivity, getActivitiesByClass, getActivitiesByOperator, getAllActivities, updateActivity} from '../controllers/activityController';

const router = express.Router();

router.post('/', addActivity); 
router.get('/actByCls/:classId', getActivitiesByClass);
router.get('/actByOp/:operatorId', getActivitiesByOperator); 
router.get('/', getAllActivities);
router.put('/activity', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
