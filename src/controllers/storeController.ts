import { Request, Response } from 'express';
import Store from '../models/Store';

export const addStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, address, businessId, contactPersons } = req.body;
  
      if (!name || !businessId || !contactPersons || !Array.isArray(contactPersons)) {
        res.status(400).json({ error: 'Missing required fields: name, businessId, or contactPersons' });
        return;
      }
  
      const newStore = new Store({
        name,
        address,
        businessId,
        contactPersons,
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
