import express from 'express';
import { addWorker, deleteAllWorkers, deleteWorker, getWorkerById, getWorkers, updateWorker, getWorkersByCoordinator } from '../controllers/workerAfterNoonController';
import { authenticateToken } from '../middleware/authHandler';


const router = express.Router();

router.post('/', addWorker);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);
router.delete('/', deleteAllWorkers);
router.get('/coordinator/:coordinatorId', authenticateToken, getWorkersByCoordinator);

export default router; 