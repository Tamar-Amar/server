import express from 'express';
import { 
    addClass, 
    deleteClass, 
    getAllClasses,
    updateClass,
    getClassesByCoordinator,
} from '../controllers/classController';
import { authenticateToken } from '../middleware/authHandler';

const router = express.Router();

router.post('/', addClass);
router.delete('/:id', deleteClass);
router.get('/', getAllClasses);
router.put('/:id', updateClass);
router.get('/coordinator/:coordinatorId', authenticateToken, getClassesByCoordinator);


export default router;
