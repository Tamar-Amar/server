import express from 'express';
import {
  getWorkers,
  getWorkerById,
  addWorker,
  updateWorker,
  deleteWorker,
  getWorkersByCoordinator,
  getWorkersByAccountant,
  validateWorkersExist,
  getWorkersForGeneralUpdate,
  updateBatchWorkers,
  updateGeneralWorkers,
  deleteAllWorkers,
  addMultipleWorkers,
  deleteMultipleWorkers
} from '../controllers/workerAfterNoonController';
import { authenticateToken } from '../middleware/authHandler';


const router = express.Router();

router.post('/', addWorker);
router.post('/multiple', addMultipleWorkers);
router.post('/delete-multiple', deleteMultipleWorkers);
router.post('/update-batch', updateBatchWorkers);
router.post('/update-general', updateGeneralWorkers);
router.post('/validate-exist', validateWorkersExist);
router.post('/get-for-general-update', getWorkersForGeneralUpdate);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);
router.delete('/', deleteAllWorkers);
router.get('/coordinator/:coordinatorId', authenticateToken, getWorkersByCoordinator);
router.get('/accountant/:accountantId', authenticateToken, getWorkersByAccountant);

export default router; 