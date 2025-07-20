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

    // מצא את כל העובדים הקיימים
    const existingWorkers = await WorkerAfterNoon.find({ id: { $in: workerIds } }).lean();
    const existingIds = existingWorkers.map(w => w.id);

    res.status(200).json({ existingIds, existingWorkers });
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
        
        // מצא את העובד לפי תעודת זהות
        const worker = await WorkerAfterNoon.findOne({ id: id });
        
        if (!worker) {
          failed.push({ id, error: 'העובד לא נמצא' });
          continue;
        }

        const oldValue = worker.get(field);
        
        // טיפול מיוחד בשדות בוליאניים
        let valueToSet = newValue;
        if (field === 'is101' || field === 'isActive') {
          const stringValue = String(newValue).toLowerCase();
          valueToSet = stringValue === 'יש' || stringValue === 'true' || stringValue === 'כן' || stringValue === '1';
        }
        
        // טיפול מיוחד ב-projectCodes
        if (field === 'projectCodes') {
          if (Array.isArray(newValue)) {
            valueToSet = newValue;
          } else {
            failed.push({ id, error: 'קודי פרויקט חייבים להיות מערך' });
            continue;
          }
        }
        
        // נרמול התפקיד אם זה השדה שמתעדכן
        if (field === 'roleName' && typeof newValue === 'string') {
          valueToSet = newValue.trim().replace(/\s+/g, ' ');
        }
        
        // עדכן את השדה
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
    
    // קבלת פרטי הרכז
    const User = require('../models/User').default;
    const coordinator = await User.findById(coordinatorId);
    
    
    if (!coordinator) {
      res.status(404).json({ error: 'רכז לא נמצא' });
      return;
    }

    // אם אין שיוכי פרויקטים, החזר מערך ריק
    if (!coordinator.projectCodes || coordinator.projectCodes.length === 0) {
      
      res.status(200).json([]);
      return;
    }

    // יצירת רשימת קודי מוסד של הרכז
    const coordinatorInstitutionCodes = coordinator.projectCodes.map((pc: any) => pc.institutionCode);
    
    
    // מציאת כל הכיתות של קודי המוסד של הרכז
    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes }
    });
    

    // יצירת רשימת עובדים עם פרטי הכיתה
    const workersWithClassInfo: any[] = [];
    classes.forEach(cls => {
      if (cls.workers) {
        cls.workers.forEach((worker: any) => {
          // בדיקה שהעובד שייך לפרויקט שהרכז אחראי עליו
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

    // קבלת פרטי העובדים
    const workerIds = workersWithClassInfo.map(w => w.workerId);
    const workers = await WorkerAfterNoon.find({
      _id: { $in: workerIds },
      isActive: true
    }).sort({ lastName: 1, firstName: 1 });

    // קבלת מספר הטפסים לכל עובד
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

    // יצירת מפה של מספר טפסים לכל עובד
    const documentsMap = new Map();
    documentsCounts.forEach((doc: any) => {
      documentsMap.set(doc._id.toString(), doc.count);
    });

    // שילוב פרטי העובדים עם פרטי הכיתה ומספר הטפסים
    const workersWithDetails = workers.map(worker => {
      const classInfo = workersWithClassInfo.find(w => w.workerId.toString() === (worker._id as any).toString());
      // מציאת הכיתה כדי לקבל את קוד המוסד
      const workerClass = classes.find(cls => cls.uniqueSymbol === classInfo?.classSymbol);
      
      // נרמול התפקיד - עדיפות ל-roleName של העובד, אם לא קיים אז roleType מהכיתה
      let normalizedRoleName = worker.roleName;
      if (!normalizedRoleName && classInfo?.roleType) {
        normalizedRoleName = classInfo.roleType;
      }
      // נרמול התפקיד - הסרת רווחים מיותרים
      if (normalizedRoleName) {
        normalizedRoleName = normalizedRoleName.trim().replace(/\s+/g, ' ');
      }
      
      return {
        ...worker.toObject(),
        classSymbol: classInfo?.classSymbol || '',
        className: classInfo?.className || '',
        project: classInfo?.project || null,
        roleType: classInfo?.roleType || '',
        roleName: normalizedRoleName || '', // עדכון roleName מנורמל
        institutionCode: workerClass?.institutionCode || '',
        documentsCount: documentsMap.get((worker._id as any).toString()) || 0
      };
    });

    // מיון לפי שם משפחה ואז שם פרטי
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
    
    // קבלת פרטי חשב השכר
    const User = require('../models/User').default;
    const accountant = await User.findById(accountantId);
    
    if (!accountant) {
      res.status(404).json({ error: 'חשב שכר לא נמצא' });
      return;
    }

    // אם אין קודי מוסד, החזר מערך ריק
    if (!accountant.accountantInstitutionCodes || accountant.accountantInstitutionCodes.length === 0) {
      res.status(200).json([]);
      return;
    }

    // מציאת כל העובדים של קודי המוסד של חשב השכר
    const workers = await WorkerAfterNoon.find({
      isActive: true
    }).sort({ lastName: 1, firstName: 1 });

    // סינון עובדים לפי קודי המוסד של חשב השכר
    const filteredWorkers = workers.filter(worker => {
      // בדיקה אם העובד שייך לאחד מקודי המוסד של חשב השכר
      return accountant.accountantInstitutionCodes.includes(worker.accountantCode);
    });

    // קבלת מספר הטפסים לכל עובד
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

    // יצירת מפה של מספר טפסים לכל עובד
    const documentsMap = new Map();
    documentsCounts.forEach((doc: any) => {
      documentsMap.set(doc._id.toString(), doc.count);
    });

    // הוספת מספר הטפסים לכל עובד
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