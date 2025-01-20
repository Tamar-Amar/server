import express from 'express';
import { 
    addClass, 
    getClassesByInstitutionId, 
    deleteClass, 
    getAllClasses
} from '../controllers/classController';

const router = express.Router();

router.post('/', addClass);
router.get('/:institutionId', getClassesByInstitutionId);
router.delete('/:id', deleteClass);
router.get('/', getAllClasses);

export default router;
