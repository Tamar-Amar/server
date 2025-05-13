import express from 'express';
import {
  addInstitution,
  getInstitutions,
  getInstitutionById,
  deleteInstitution,
  updateInstitution,
} from '../controllers/institutionController';

const router = express.Router();

router.post('/', addInstitution);
router.get('/', getInstitutions);
router.get('/:id', getInstitutionById);
router.delete('/:id', deleteInstitution);
router.put('/:id', updateInstitution)

export default router;
