import { Request, Response } from 'express';
import WorkerTag from '../models/WorkerTag';

export const addWorkerTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const tag = new WorkerTag({ name });
    const savedTag = await tag.save();
    res.status(201).json(savedTag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getWorkerTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await WorkerTag.find({ isActive: true });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateWorkerTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const updatedTag = await WorkerTag.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(updatedTag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const deleteWorkerTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tag = await WorkerTag.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}; 