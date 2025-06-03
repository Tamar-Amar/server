import { Request, Response } from 'express';

import Worker from '../models/Worker';
import { Tag } from '../models';

export const addWorkerTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const tag = new Tag({ name });
    const savedTag = await tag.save();
    res.status(201).json(savedTag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getWorkerTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await Tag.find({ isActive: true });
    console.log("Tags:", tags);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateTag = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const tag = await Tag.findByIdAndUpdate(id, { name }, { new: true });
        res.json(tag);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};
export const deleteWorkerTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tag = await Tag.findByIdAndUpdate(
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

export const getWorkerTagsByWorkerId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const worker = await Worker.findById(id);
    res.json(worker?.tags);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateWorkerTags = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { tagIds } = req.body;

    if (!workerId || !tagIds) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    worker.tags = tagIds;
    await worker.save();

    res.status(200).json({ message: 'Tags updated successfully' });
  } catch (error) {
    console.error('Error updating worker tags:', error);
    res.status(500).json({ message: 'Error updating worker tags' });
  }
};

export const bulkUpdateWorkerTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerIds, tagId } = req.body;

    if (!workerIds || !tagId || !Array.isArray(workerIds)) {
      res.status(400).json({ message: 'Missing required fields or invalid format' });
      return;
    }

    // Verify tag exists
    const tag = await Tag.findById(tagId);
    if (!tag) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    // Update all workers
    await Worker.updateMany(
      { _id: { $in: workerIds } },
      { $addToSet: { tags: tagId } }
    );

    res.status(200).json({ message: 'Tags updated successfully for all workers' });
  } catch (error) {
    console.error('Error updating worker tags in bulk:', error);
    res.status(500).json({ message: 'Error updating worker tags' });
  }
};