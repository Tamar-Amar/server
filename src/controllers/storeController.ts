import { Request, Response } from 'express';
import Store from '../models/Store';

export const addStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, businessId, contactName, contactEmail, contactPhone } = req.body;

    if (!name || !businessId || !contactName || !contactEmail || !contactPhone) {
      res.status(400).json({ error: 'Missing required fields: name, businessId, contact details' });
      return;
    }

    const newStore = new Store({
      name,
      address,
      businessId,
      contactName,
      contactEmail,
      contactPhone,
    });

    await newStore.save();
    res.status(201).json(newStore);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const stores = await Store.find();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { regularClasses } = req.body;

    const store = await Store.findById(id);
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (regularClasses) {
      await Store.findByIdAndUpdate(id, { $addToSet: { regularClasses: { $each: regularClasses } } }, { new: true });
    }

    res.status(200).json({ message: "Store updated successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};