import express from 'express';
import { addOperator, getOperators, deleteOperator } from '../controllers/operatorController';

const router = express.Router();

router.post('/', addOperator);
router.get('/', getOperators);
router.delete('/:id', deleteOperator);

export default router;
