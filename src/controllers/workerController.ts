import { Request, Response } from 'express';
import Worker from '../models/Worker';
import Class from '../models/Class';
import mongoose from 'mongoose';
import ShoveitService from '../services/ShoveitService';
import { Document } from '../models/Document';
import { Types } from 'mongoose';

interface PopulatedWorker {

  _id: Types.ObjectId;
  workingSymbols: { _id: Types.ObjectId; name: string; }[];
  tags: { _id: Types.ObjectId; name: string; }[]; 
  documents: { _id: Types.ObjectId; fileName: string; fileType: string; url: string; status: string; }[];
  birthDate: Date;
  registrationDate: Date;
  bankDetails?: {
    bankName: string;
    branchNumber: string;
    accountNumber: string;
    accountOwner: string;
  };
  [key: string]: any;
}

export const addWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerData = req.body;
    
    // Convert string IDs to ObjectIds
    if (workerData.workingSymbols) {
      workerData.workingSymbols = workerData.workingSymbols.map((id: string) => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      );
    }
    if (workerData.tags) {
      workerData.tags = workerData.tags.map((id: string) => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      );
    }

    const worker = new Worker(workerData);
    const savedWorker = await worker.save();

    // Update worker data in Shoveit system
    try {
      await ShoveitService.updateWorkerData(savedWorker);
    } catch (shoveitError) {
      console.error('Failed to add worker to Shoveit:', shoveitError);
      // Continue with the response even if Shoveit update fails
    }

    res.status(201).json(savedWorker);
  } catch (err) {
    console.error('Error adding worker:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const workers = await Worker.find()
      .populate('workingSymbols')
      .populate('tags')
      .populate('documents')
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
    const worker = await Worker.findById(id)
      .populate({
        path: 'workingSymbols',
      })
      .populate({
        path: 'tags',
      })
      .populate({
        path: 'documents',
      })
      .lean()
      .exec() as unknown as PopulatedWorker;
    console.log("Worker in getWorkerById controller server:", worker);
    if (!worker) {
      res.status(404).json({ error: "העובד לא נמצא" });
      return;
    }

    console.log("Worker in getWorkerById controller server:", worker);
    // Transform dates to ISO string format for proper JSON serialization
    const formattedWorker = {
      ...worker,
      _id: worker._id.toString(),
      birthDate: worker.birthDate ? new Date(worker.birthDate).toISOString() : null,
      registrationDate: worker.registrationDate ? new Date(worker.registrationDate).toISOString() : null,
      workingSymbols: (worker.workingSymbols || []).map(symbol => ({
        _id: symbol._id.toString(),
        name: symbol.name
      })),
      tags: (worker.tags || []).map(tag => ({
        _id: tag._id.toString(),
        name: tag.name
      })),
      documents: (worker.documents || []).map(doc => ({
        _id: doc._id.toString(),
        fileName: doc.fileName,
        fileType: doc.fileType,
        url: doc.url,
        status: doc.status
      })),
      bankDetails: worker.bankDetails || {
        bankName: '',
        branchNumber: '',
        accountNumber: '',
        accountOwner: ''
      }
    };

    console.log('Worker with documents:', formattedWorker);
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

    // Convert string IDs to ObjectIds
    if (updatedData.workingSymbols) {
      updatedData.workingSymbols = updatedData.workingSymbols.map((id: string) => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      );
    }
    if (updatedData.tags) {
      updatedData.tags = updatedData.tags.map((id: string) => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      );
    }

    // Convert date strings to Date objects
    if (updatedData.birthDate) {
      updatedData.birthDate = new Date(updatedData.birthDate);
    }
    if (updatedData.registrationDate) {
      updatedData.registrationDate = new Date(updatedData.registrationDate);
    }

    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      { ...updatedData },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('workingSymbols')
    .populate('tags')
    .populate('documents');

    if (!updatedWorker) {
      res.status(404).json({ error: 'העובד לא נמצא' });
      return;
    }

    // Update worker data in Shoveit system
    try {
      await ShoveitService.updateWorkerData(updatedWorker);
    } catch (shoveitError) {
      console.error('Failed to update worker in Shoveit:', shoveitError);
      // Continue with the response even if Shoveit update fails
    }

    // Format the response
    const formattedWorker = {
      ...updatedWorker.toObject(),
      birthDate: updatedWorker.birthDate ? updatedWorker.birthDate.toISOString() : null,
      registrationDate: updatedWorker.registrationDate ? updatedWorker.registrationDate.toISOString() : null,
      workingSymbols: updatedWorker.workingSymbols || [],
      tags: updatedWorker.tags || [],
      documents: updatedWorker.documents || [],
      bankDetails: updatedWorker.bankDetails || {
        bankName: '',
        branchNumber: '',
        accountNumber: '',
        accountOwner: ''
      }
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
    const worker = await Worker.findByIdAndDelete(workerId);

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

export const getWorkerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'לא נמצא משתמש מחובר' });
      return;
    }

    const workerId = req.user.id;

    const worker = await Worker.findById(workerId)
      .populate('documents.documentId')
      .lean()
      .exec();

    if (!worker) {
      res.status(404).json({ message: 'עובד לא נמצא' });
      return;
    }

    res.json(worker);
  } catch (error) {
    console.error('Error fetching worker profile:', error);
    res.status(500).json({ message: 'שגיאת שרת' });
  }
}; 