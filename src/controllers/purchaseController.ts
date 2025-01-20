// src/controllers/purchaseController.ts
import { Request, Response } from 'express';
import Purchase from '../models/Purchases';

// Add Purchase
export const addPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchase = new Purchase(req.body);
    await purchase.save();
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

// Get Purchases
export const getPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchases = await Purchase.find();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// Delete Purchase
export const deletePurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
