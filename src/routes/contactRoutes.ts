import express from 'express';
import {
  addContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
} from '../controllers/contactController';

const router = express.Router();

router.post('/', addContact);
router.get('/', getAllContacts);
router.get('/:id', getContactById);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
