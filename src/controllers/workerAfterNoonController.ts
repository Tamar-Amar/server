import { Request, Response } from 'express';
import WorkerAfterNoon from '../models/WorkerAfterNoon';
import Class from '../models/Class';



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
    const worker = await WorkerAfterNoon.findById(workerId);

    if (!worker) {
      res.status(404).json({ error: 'העובד לא נמצא' });
      return;
    }


    const updateResult = await Class.updateMany(
      { 'workers.workerId': workerId },
      { $pull: { workers: { workerId: workerId } } }
    );

    await WorkerAfterNoon.findByIdAndDelete(workerId);

    res.status(200).json({ 
      message: 'העובד נמחק בהצלחה',
      removedFromClasses: updateResult.modifiedCount
    });
  } catch (err) {
    console.error('Error deleting worker:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteAllWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const updateResult = await Class.updateMany(
      { workers: { $exists: true, $ne: [] } },
      { $set: { workers: [] } }
    );

    const deleteResult = await WorkerAfterNoon.deleteMany({});

    res.status(200).json({ 
      message: 'כל העובדים נמחקו בהצלחה',
      deletedWorkers: deleteResult.deletedCount,
      clearedFromClasses: updateResult.modifiedCount
    });
  } catch (err) {
    console.error('Error deleting all workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const addMultipleWorkers = async (req: Request, res: Response): Promise<void> => {
  try {    
    const workersData = req.body.workers;
    
    if (!Array.isArray(workersData)) {
      console.error('Invalid workers data - not an array:', workersData);
      res.status(400).json({ error: 'נדרש מערך של עובדים' });
      return;
    }    

    const existingWorkers = await WorkerAfterNoon.find({
      id: { $in: workersData.map(w => w.id) }
    });
    
    const existingIds = new Set(existingWorkers.map(w => w.id));
    const newWorkers = workersData.filter(w => !existingIds.has(w.id));
    const duplicateWorkers = workersData.filter(w => existingIds.has(w.id));
    
    
    // Validate each new worker before creating
    const validatedWorkers = [];
    for (let i = 0; i < newWorkers.length; i++) {
      try {
        const worker = new WorkerAfterNoon(newWorkers[i]);
        await worker.validate();
        validatedWorkers.push(worker);
      } catch (validationError) {
        console.error(`Validation error for worker ${i}:`, validationError);
        res.status(400).json({ 
          error: `שגיאה בעובד מספר ${i + 1}: ${(validationError as Error).message}`,
          workerIndex: i,
          workerData: newWorkers[i]
        });
        return;
      }
    }

    let savedWorkers: any[] = [];
    if (validatedWorkers.length > 0) {
      savedWorkers = await WorkerAfterNoon.insertMany(validatedWorkers);
    }


    const allWorkers = [...savedWorkers, ...existingWorkers];
    res.status(201).json(allWorkers);
  } catch (err) {
    console.error('Error adding multiple workers:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const deleteMultipleWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerIds } = req.body;
    
    if (!Array.isArray(workerIds)) {
      res.status(400).json({ error: 'נדרש מערך של מזהה עובדים' });
      return;
    }


    const updateResult = await Class.updateMany(
      { 'workers.workerId': { $in: workerIds } },
      { $pull: { workers: { workerId: { $in: workerIds } } } }
    );


    const deleteResult = await WorkerAfterNoon.deleteMany({ _id: { $in: workerIds } });

    res.status(200).json({ 
      message: `${deleteResult.deletedCount} עובדים נמחקו בהצלחה`,
      deletedWorkers: deleteResult.deletedCount,
      removedFromClasses: updateResult.modifiedCount
    });
  } catch (err) {
    console.error('Error deleting multiple workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getWorkersByCoordinator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { coordinatorId } = req.params;
    const workers = await WorkerAfterNoon.find({ coordinatorId, isActive: true });
    res.status(200).json(workers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};