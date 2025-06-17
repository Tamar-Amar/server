import { Request, Response } from 'express';
import WorkerAfterNoon from '../models/WorkerAfterNoon';



export const addWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerData = req.body;

    const worker = new WorkerAfterNoon(workerData);
    const savedWorker = await worker.save();

    res.status(201).json(savedWorker);
  } catch (err) {
    console.error('Error adding worker:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const workers = await WorkerAfterNoon.find()
      .sort({ lastName: 1, firstName: 1 })
      .lean()
      .exec();

    res.json(workers);
  } catch (err) {
    console.error('Error fetching workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getWorkerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const worker = await WorkerAfterNoon.findById(id)
      .lean()
      .exec();
    if (!worker) {
      res.status(404).json({ error: "העובד לא נמצא" });
      return;
    }

    const formattedWorker = {
      ...worker,
      _id: worker._id.toString(),
      createDate: worker.createDate ? new Date(worker.createDate).toISOString() : null,
      updateDate: worker.updateDate ? new Date(worker.updateDate).toISOString() : null,
      startDate: worker.startDate ? new Date(worker.startDate).toISOString() : null,
      endDate: worker.endDate ? new Date(worker.endDate).toISOString() : null,
    };

    res.status(200).json(formattedWorker);
  } catch (err) {
    console.error('Error fetching worker by ID:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerId = req.params.id;
    const updatedData = req.body;
    updatedData.updateDate = new Date();

    const updatedWorker = await WorkerAfterNoon.findByIdAndUpdate(
      workerId,
      { ...updatedData },
      { 
        new: true, 
        runValidators: true 
      }
    )

    if (!updatedWorker) {
      res.status(404).json({ error: 'העובד לא נמצא' });
      return;
    }

    const formattedWorker = {
      ...updatedWorker.toObject(),
      createDate: updatedWorker.createDate ? updatedWorker.createDate.toISOString() : null,
      updateDate: updatedWorker.updateDate ? updatedWorker.updateDate.toISOString() : null,
      startDate: updatedWorker.startDate ? updatedWorker.startDate.toISOString() : null,
      endDate: updatedWorker.endDate ? updatedWorker.endDate.toISOString() : null,
    };

    res.status(200).json(formattedWorker);
  } catch (err) {
    console.error('Error updating worker:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const deleteWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerId = req.params.id;
    const worker = await WorkerAfterNoon.findByIdAndDelete(workerId);

    if (!worker) {
      res.status(404).json({ error: 'העובד לא נמצא' });
      return;
    }

    res.status(200).json({ message: 'העובד נמחק בהצלחה' });
  } catch (err) {
    console.error('Error deleting worker:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteAllWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    await WorkerAfterNoon.deleteMany({});
    res.status(200).json({ message: 'כל העובדים נמחקו בהצלחה' });
  } catch (err) {
    console.error('Error deleting all workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};