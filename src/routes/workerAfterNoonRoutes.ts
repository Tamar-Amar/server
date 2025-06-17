import express from 'express';
import { addWorker, deleteAllWorkers, deleteWorker, getWorkerById, getWorkers, updateWorker } from '../controllers/workerAfterNoonController';


const router = express.Router();

router.post('/', addWorker);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);
router.delete('/', deleteAllWorkers);

export default router; 