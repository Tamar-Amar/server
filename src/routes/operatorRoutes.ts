import express from 'express';
import { addOperator, getOperators, deleteOperator, updateOperator, getCurrentOperator } from '../controllers/operatorController';

const router = express.Router();

router.post('/', addOperator);
router.get('/', getOperators);
router.delete('/:id', deleteOperator);
router.put('/:id', updateOperator); 
router.get('/me', getCurrentOperator); 


export default router;
