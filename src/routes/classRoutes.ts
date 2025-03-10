import express from 'express';
import { 
    addClass, 
    getClassesByInstitutionId, 
    deleteClass, 
    getAllClasses,
    updateClass
} from '../controllers/classController';

const router = express.Router();

router.post('/', addClass);
router.get('/:institutionId', getClassesByInstitutionId);
router.delete('/:id', deleteClass);
router.get('/', getAllClasses);
router.put('/:id', updateClass);


export default router;
