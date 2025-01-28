// src/controllers/invoiceController.ts
import { Request, Response } from 'express';
import Invoice from '../models/Invoice';

// Add Invoice
export const addInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

// Get Invoices
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// Update Invoice Status
export const updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
