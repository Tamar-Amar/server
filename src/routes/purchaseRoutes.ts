// src/routes/purchaseRoutes.ts
import express from 'express';
import { addPurchase, getPurchases, deletePurchase } from '../controllers/purchaseController';

const router = express.Router();

router.post('/', addPurchase);
router.get('/', getPurchases);
router.delete('/:id', deletePurchase);

export default router;
