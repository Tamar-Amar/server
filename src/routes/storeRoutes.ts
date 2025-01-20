import express from 'express';
import { addStore, getStores, deleteStore } from '../controllers/storeController';

const router = express.Router();

router.post('/', addStore);
router.get('/', getStores);
router.delete('/:id', deleteStore);

export default router;
