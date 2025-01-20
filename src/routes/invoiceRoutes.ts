// src/routes/invoiceRoutes.ts
import express from 'express';
import { addInvoice, getInvoices, updateInvoiceStatus } from '../controllers/invoiceController';

const router = express.Router();

router.post('/', addInvoice);
router.get('/', getInvoices);
router.patch('/:id/status', updateInvoiceStatus);

export default router;
