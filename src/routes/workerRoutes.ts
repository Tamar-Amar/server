import express from 'express';
import { addWorker, deleteWorker, getWorkerById, getWorkers, updateWorker } from '../controllers/workerController';


const router = express.Router();

router.post('/', addWorker);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);


export default router; 