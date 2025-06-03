import express from 'express';
import { addWorker, deleteWorker, getWorkerById, getWorkers, updateWorker, getWorkerProfile } from '../controllers/workerController';
import { authenticateToken } from '../middleware/authHandler';


const router = express.Router();

router.post('/', addWorker);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);

router.get('/profile', authenticateToken, getWorkerProfile);

export default router; 