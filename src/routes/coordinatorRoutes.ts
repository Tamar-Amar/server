import express from 'express';
import {
  getAllCoordinators,
  getCoordinatorById,
  createCoordinator,
  updateCoordinator,
  deleteCoordinator
} from '../controllers/coordinatorController';

const router = express.Router();

router.get('/', getAllCoordinators);
router.get('/:id', getCoordinatorById);
router.post('/', createCoordinator);
router.put('/:id', updateCoordinator);
router.delete('/:id', deleteCoordinator);

export default router; 