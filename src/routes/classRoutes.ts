import express from 'express';
import { 
    addClass, 
    deleteClass, 
    getAllClasses,
    updateClass
} from '../controllers/classController';

const router = express.Router();

router.post('/', addClass);
router.delete('/:id', deleteClass);
router.get('/', getAllClasses);
router.put('/:id', updateClass);


export default router;
