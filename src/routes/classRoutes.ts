import express from 'express';
import { 
    addClass, 
    addMultipleClasses,
    deleteClass, 
    getAllClasses,
    updateClass,
    updateMultipleClasses,
    getClassesByCoordinator,
    bulkAddWorkersToClasses,
    getClassesByCoordinatorInstitutionCodes
} from '../controllers/classController';
import { authenticateToken } from '../middleware/authHandler';

const router = express.Router();

router.post('/', addClass);
router.post('/bulk', addMultipleClasses);
router.put('/bulk', updateMultipleClasses);
router.post('/bulk-add-workers', bulkAddWorkersToClasses);
router.delete('/:id', deleteClass);
router.get('/', getAllClasses);
router.put('/:id', updateClass);
router.get('/coordinator/:coordinatorId', authenticateToken, getClassesByCoordinator);
router.get('/coordinator-institution-codes/:coordinatorId', getClassesByCoordinatorInstitutionCodes);


export default router;
