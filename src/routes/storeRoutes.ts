import express from 'express';
import { addStore, getStores, deleteStore, updateStore } from '../controllers/storeController';

const router = express.Router();

router.post('/', addStore);
router.get('/', getStores);
router.delete('/:id', deleteStore);
router.put('/:id', updateStore);

export default router;
