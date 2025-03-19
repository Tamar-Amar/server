import express from 'express';
import { addOperator, getOperators, deleteOperator, updateOperator, getCurrentOperator, getOperatorById, updateOperatorWeeklySchedule } from '../controllers/operatorController';

const router = express.Router();

router.post('/', addOperator);
router.get('/:id', getOperatorById);
router.get('/', getOperators);
router.delete('/:id', deleteOperator);
router.put('/:id', updateOperator); 
router.get('/me', getCurrentOperator); 
router.put('/:id/weekly-schedule', updateOperatorWeeklySchedule);


export default router;
