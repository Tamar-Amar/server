import { Request, Response } from 'express';
import WorkerAfterNoon from '../models/WorkerAfterNoon';
import Class from '../models/Class';



export const addWorker = async (req: Request, res: Response): Promise<void> => {
  try {
    const workerData = req.body;

    // נרמול התפקיד אם קיים
    if (workerData.roleName) {
      workerData.roleName = workerData.roleName.trim().replace(/\s+/g, ' ');
    }

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

    // נרמול התפקיד אם קיים
    if (updatedData.roleName) {
      updatedData.roleName = updatedData.roleName.trim().replace(/\s+/g, ' ');
    }

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
    const body = req.body;
    let workers;
    
    // בדיקה אם הנתונים נשלחו כאובייקט עם שדה workers או כמערך ישיר
    if (body && body.workers && Array.isArray(body.workers)) {
      workers = body.workers;
    } else if (Array.isArray(body)) {
      workers = body;
    } else {
      console.error('Invalid request body format:', typeof body, body);
      res.status(400).json({ error: 'נדרש מערך של עובדים או אובייקט עם שדה workers' });
      return;
    }
    
    // בדיקה שהמערך לא ריק
    if (workers.length === 0) {
      res.status(400).json({ error: 'מערך העובדים ריק' });
      return;
    }
    
    // נרמול התפקידים לכל העובדים
    const normalizedWorkers = workers.map((worker: any) => {
      if (worker.roleName) {
        worker.roleName = worker.roleName.trim().replace(/\s+/g, ' ');
      }
      return worker;
    });
    
    const result = await WorkerAfterNoon.insertMany(normalizedWorkers);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error adding multiple workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const validateWorkersExist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerIds } = req.body;
    
    if (!Array.isArray(workerIds)) {
      res.status(400).json({ error: 'נדרש מערך של תעודות זהות' });
      return;
    }

    const existingWorkers = await WorkerAfterNoon.find({ id: { $in: workerIds } }).lean();
    const existingIds = existingWorkers.map(w => w.id);

    const Class = require('../models/Class').default;
    const enrichedWorkers = await Promise.all(
      existingWorkers.map(async (worker) => {
        const workerClasses = await Class.find({
          'workers.workerId': worker._id,
          'workers.project': 4
        });

        let classSymbol = 'לא מוגדר';
        if (workerClasses.length > 0) {
          const workerInClass = workerClasses[0].workers.find((w: any) => 
            w.workerId.toString() === worker._id.toString() && w.project === 4
          );
          if (workerInClass && workerInClass.classSymbol) {
            classSymbol = workerInClass.classSymbol;
          }
        }

        return {
          ...worker,
          classSymbol
        };
      })
    );

    res.status(200).json({ existingIds, existingWorkers: enrichedWorkers });
  } catch (err) {
    console.error('Error validating workers exist:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateBatchWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { field, updates } = req.body;
    
    if (!field || !Array.isArray(updates)) {
      res.status(400).json({ error: 'נדרש שדה ומערך עדכונים' });
      return;
    }

    const success: Array<{ id: string; oldValue: any; newValue: any }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      try {
        const { id, newValue } = update;
        
        const worker = await WorkerAfterNoon.findOne({ id: id });
        
        if (!worker) {
          failed.push({ id, error: 'העובד לא נמצא' });
          continue;
        }

        const oldValue = worker.get(field);
        
        let valueToSet = newValue;
        if (field === 'is101' || field === 'isActive') {
          const stringValue = String(newValue).toLowerCase();
          valueToSet = stringValue === 'יש' || stringValue === 'true' || stringValue === 'כן' || stringValue === '1';
        }
        
        if (field === 'projectCodes') {
          if (Array.isArray(newValue)) {
            valueToSet = newValue;
          } else {
            failed.push({ id, error: 'קודי פרויקט חייבים להיות מערך' });
            continue;
          }
        }
        
        if (field === 'roleName' && typeof newValue === 'string') {
          valueToSet = newValue.trim().replace(/\s+/g, ' ');
        }
        
        worker.set(field, valueToSet);
        worker.updateDate = new Date();
        
        await worker.save();
        
        success.push({ id, oldValue, newValue });
      } catch (error) {
        console.error(`Error updating worker ${update.id}:`, error);
        failed.push({ id: update.id, error: (error as Error).message });
      }
    }

    res.status(200).json({ success, failed });
  } catch (err) {
    console.error('Error updating batch workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteMultipleWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerIds } = req.body;
    const result = await WorkerAfterNoon.deleteMany({ _id: { $in: workerIds } });
    res.status(200).json(result);
  } catch (err) {
    console.error('Error deleting multiple workers:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getWorkersByCoordinator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { coordinatorId } = req.params;
    
    const User = require('../models/User').default;
    const coordinator = await User.findById(coordinatorId);
    
    
    if (!coordinator) {
      res.status(404).json({ error: 'רכז לא נמצא' });
      return;
    }

    if (!coordinator.projectCodes || coordinator.projectCodes.length === 0) {
      
      res.status(200).json([]);
      return;
    }

    const coordinatorInstitutionCodes = coordinator.projectCodes.map((pc: any) => pc.institutionCode);
    

    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes }
    });
    

    
    const workersWithClassInfo: any[] = [];
    classes.forEach(cls => {
      if (cls.workers) {
        cls.workers.forEach((worker: any) => {
          
          const coordinatorProjectCodes = coordinator.projectCodes
            .filter((pc: any) => pc.institutionCode === cls.institutionCode)
            .map((pc: any) => pc.projectCode);
          
          if (coordinatorProjectCodes.includes(worker.project)) {
            workersWithClassInfo.push({
              workerId: worker.workerId,
              classSymbol: cls.uniqueSymbol,
              className: cls.name,
              project: worker.project,
              roleType: worker.roleType
            });
          }
        });
      }
    });

    
    const workerIds = workersWithClassInfo.map(w => w.workerId);
    const workers = await WorkerAfterNoon.find({
      _id: { $in: workerIds },
      isActive: true
    }).sort({ lastName: 1, firstName: 1 });

    
    const Document = require('../models/Document').default;
    const documentsCounts = await Document.aggregate([
      {
        $match: {
          operatorId: { $in: workerIds }
        }
      },
      {
        $group: {
          _id: '$operatorId',
          count: { $sum: 1 }
        }
      }
    ]);

    
    const documentsMap = new Map();
    documentsCounts.forEach((doc: any) => {
      documentsMap.set(doc._id.toString(), doc.count);
    });

    
    const workersWithDetails = workers.map(worker => {
      const classInfo = workersWithClassInfo.find(w => w.workerId.toString() === (worker._id as any).toString());
      
      const workerClass = classes.find(cls => cls.uniqueSymbol === classInfo?.classSymbol);
      
      
      let normalizedRoleName = worker.roleName;
      if (!normalizedRoleName && classInfo?.roleType) {
        normalizedRoleName = classInfo.roleType;
      }
      
      if (normalizedRoleName) {
        normalizedRoleName = normalizedRoleName.trim().replace(/\s+/g, ' ');
      }
      
      return {
        ...worker.toObject(),
        classSymbol: classInfo?.classSymbol || '',
        className: classInfo?.className || '',
        project: classInfo?.project || null,
        roleType: classInfo?.roleType || '',
        roleName: normalizedRoleName || '',
        institutionCode: workerClass?.institutionCode || '',
        documentsCount: documentsMap.get((worker._id as any).toString()) || 0
      };
    });

    
    workersWithDetails.sort((a, b) => {
      const lastNameComparison = (a.lastName || '').localeCompare(b.lastName || '', 'he');
      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }
      return (a.firstName || '').localeCompare(b.firstName || '', 'he');
    });

    res.status(200).json(workersWithDetails);
  } catch (err) {
    console.error('Error fetching workers by coordinator:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getWorkersByAccountant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountantId } = req.params;
    

    const User = require('../models/User').default;
    const accountant = await User.findById(accountantId);
    
    if (!accountant) {
      res.status(404).json({ error: 'חשב שכר לא נמצא' });
      return;
    }

    
    if (!accountant.accountantInstitutionCodes || accountant.accountantInstitutionCodes.length === 0) {
      res.status(200).json([]);
      return;
    }

    
    const workers = await WorkerAfterNoon.find({
      isActive: true
    }).sort({ lastName: 1, firstName: 1 });

    
    const filteredWorkers = workers.filter(worker => {
      
      return accountant.accountantInstitutionCodes.includes(worker.accountantCode);
    });

    
    const Document = require('../models/Document').default;
    const workerIds = filteredWorkers.map(w => w._id);
    const documentsCounts = await Document.aggregate([
      {
        $match: {
          operatorId: { $in: workerIds }
        }
      },
      {
        $group: {
          _id: '$operatorId',
          count: { $sum: 1 }
        }
      }
    ]);

    
    const documentsMap = new Map();
    documentsCounts.forEach((doc: any) => {
      documentsMap.set(doc._id.toString(), doc.count);
    });

    
    const workersWithDetails = filteredWorkers.map(worker => ({
      ...worker.toObject(),
      documentsCount: documentsMap.get((worker._id as any).toString()) || 0
    }));

    res.status(200).json(workersWithDetails);
  } catch (err) {
    console.error('Error fetching workers by accountant:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateGeneralWorkers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectCode, updates } = req.body;
    
    if (!projectCode || !Array.isArray(updates)) {
      res.status(400).json({ error: 'נדרש קוד פרויקט ומערך עדכונים' });
      return;
    }

    const success: Array<{ id: string; changes: string[] }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      try {
        const { id, firstName, lastName, phone, email, roleName, classSymbol } = update;
        
        
        const worker = await WorkerAfterNoon.findOne({ id: id });
        
        if (!worker) {
          failed.push({ id, error: 'העובד לא נמצא' });
          continue;
        }

        
        const Class = require('../models/Class').default;
        const workerClasses = await Class.find({
          'workers.workerId': worker._id,
          'workers.project': projectCode
        });

        if (workerClasses.length === 0) {
          failed.push({ id, error: 'העובד לא מופיע בפרויקט קייטנת קיץ' });
          continue;
        }

        const changes: string[] = [];
        const updateData: any = {};

        
        if (firstName && firstName !== worker.firstName) {
          updateData.firstName = firstName;
          changes.push('שם פרטי');
        }
        if (lastName && lastName !== worker.lastName) {
          updateData.lastName = lastName;
          changes.push('שם משפחה');
        }
        if (phone && phone !== worker.phone) {
          updateData.phone = phone;
          changes.push('טלפון');
        }
        if (email && email !== worker.email) {
          updateData.email = email;
          changes.push('אימייל');
        }
        if (roleName && roleName !== worker.roleName) {
          updateData.roleName = roleName.trim().replace(/\s+/g, ' ');
          changes.push('תפקיד');
        }

        
        if (classSymbol) {
          
          const newClass = await Class.findOne({ uniqueSymbol: classSymbol });
          
          if (!newClass) {
            failed.push({ id, error: `כיתה עם סמל ${classSymbol} לא נמצאה` });
            continue;
          }

          
          const workerInNewClass = newClass.workers.find((w: any) => 
            w.workerId.toString() === (worker._id as any).toString() && w.project === projectCode
          );

          if (!workerInNewClass) {
            
            for (const oldClass of workerClasses) {
              oldClass.workers = oldClass.workers.filter((w: any) => 
                !(w.workerId.toString() === (worker._id as any).toString() && w.project === projectCode)
              );
              await oldClass.save();
            }

            
            newClass.workers.push({
              workerId: worker._id,
              project: projectCode,
              roleType: roleName || 'לא נבחר'
            });
            await newClass.save();
            
            changes.push('סמל כיתה');
          }
        }

        
        if (Object.keys(updateData).length > 0) {
          updateData.updateDate = new Date();
          await WorkerAfterNoon.findByIdAndUpdate(worker._id, updateData);
        }

        if (changes.length > 0) {
          success.push({ id, changes });
        }
      } catch (error) {
        console.error(`Error updating worker ${update.id}:`, error);
        failed.push({ id: update.id, error: (error as Error).message });
      }
    }

    res.status(200).json({ success, failed });
  } catch (err) {
    console.error('Error in general update:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getWorkersForGeneralUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerIds } = req.body;
    
    if (!Array.isArray(workerIds)) {
      res.status(400).json({ error: 'נדרש מערך של תעודות זהות' });
      return;
    }
    
    const existingWorkers = await WorkerAfterNoon.find({ id: { $in: workerIds } }).lean();      
    
    const Class = require('../models/Class').default;
    const enrichedWorkers = await Promise.all(
      existingWorkers.map(async (worker) => {
        
        const workerClasses = await Class.find({
          'workers.workerId': worker._id,
          'workers.project': 4
        });

        
        let classSymbol = 'לא מוגדר';
        if (workerClasses.length > 0) {
          const workerInClass = workerClasses[0].workers.find((w: any) => 
            w.workerId.toString() === worker._id.toString() && w.project === 4
          );
          
          
          if (workerInClass) {
            classSymbol = workerClasses[0].uniqueSymbol || 'לא מוגדר';
          }
        }

        const enrichedWorker = {
          id: worker.id,
          firstName: worker.firstName,
          lastName: worker.lastName,
          phone: worker.phone,
          email: worker.email,
          roleName: worker.roleName,
          classSymbol
        };

        
        return enrichedWorker;
      })
    );

    
    res.status(200).json({ workers: enrichedWorkers });
  } catch (err) {
    console.error('Error getting workers for general update:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};