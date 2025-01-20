import express from 'express';
import {
  addInstitution,
  getInstitutions,
  getInstitutionById,
  deleteInstitution,
} from '../controllers/institutionController';

const router = express.Router();

router.post('/', addInstitution);
router.get('/', getInstitutions);
router.get('/:id', getInstitutionById);
router.delete('/:id', deleteInstitution);

export default router;
