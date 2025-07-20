import { Request, RequestHandler } from 'express';
import DocumentModel, { Document, DocumentStatus, DocumentType } from '../models/Document';
import { uploadFileToS3, deleteFileFromS3, getSignedUrl } from '../services/s3Service';
import { Types } from 'mongoose';


interface RequestWithUser extends Request {
  user?: { id: string; role: string; idNumber?: string; username?: string };
  file?: Express.Multer.File;
}

const generateFileName = (tz: string, documentType: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${tz}-${date}`;
};

export const uploadDocument: RequestHandler = async (req: RequestWithUser, res, next) => {
  console.log('Upload request body:', req.body);
  console.log('Upload request file:', req.file);
  
  try {
    if (!req.file) {
      console.log('No file uploaded');
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }
    
    // בדיקה נכונה של השדות שנשלחים מהלקוח
    if (!req.body.workerId || !req.body.documentType || !req.body.tz) {
      console.log('Missing required fields:', req.body);
      res.status(400).json({ error: 'חסרים שדות חובה: workerId, documentType, או tz' });
      return;
    }

    const { workerId, documentType, expiryDate, tz } = req.body;
    const { buffer, mimetype, size } = req.file;

    // בדיקה נוספת ש-documentType לא undefined או ריק
    if (!documentType || documentType === 'undefined' || documentType.trim() === '') {
      console.log('Invalid document type:', documentType);
      res.status(400).json({ error: 'סוג מסמך לא תקין או חסר' });
      return;
    }

    try {
      const operatorId = new Types.ObjectId(workerId);
      console.log('Operator ID:', operatorId);
      const newFileName = generateFileName(tz, documentType);
      console.log('New file name:', newFileName);
      const s3Key = await uploadFileToS3(buffer, newFileName, mimetype);
      console.log('S3 key:', s3Key);
      const doc = await DocumentModel.create({
        operatorId,
        fileName: newFileName,
        fileType: mimetype,
        size: size,
        s3Key,
        expiryDate,
        uploadedAt: new Date(),
        uploadedBy: req.user?.id || 'system',
        tag: documentType.trim(), // וודא שהתג מנורמל
        status: DocumentStatus.PENDING,
        comments: ''
      });

      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        res.status(400).json({ error: 'מזהה עובד לא תקין' });
        return;
      }
      throw error;
    }
  } catch (err: unknown) {
    console.error('Error in uploadDocument:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getWorkerDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    
    try {
      const operatorId = new Types.ObjectId(workerId);
      const documents = await DocumentModel.find({ operatorId });

      const docsWithUrls = await Promise.all(documents.map(async (doc) => {
        const url = await getSignedUrl(doc.s3Key as string);
        const docObj = doc.toObject();
        return { 
          ...docObj, 
          url,
          createdAt: docObj.uploadedAt, // מיפוי uploadedAt ל-createdAt
          updatedAt: docObj.uploadedAt  // מיפוי uploadedAt ל-updatedAt
        };
      }));

      res.json(docsWithUrls);
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        res.status(400).json({ error: 'מזהה עובד לא תקין' });
        return;
      }
      throw error;
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const updateDocumentStatus: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status} = req.body;

    const doc = await DocumentModel.findByIdAndUpdate(
      documentId,
      { status },
      { new: true }
    );

    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    res.json(doc);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    await deleteFileFromS3(doc.s3Key as string);
    
    await DocumentModel.findByIdAndDelete(doc._id);

    res.json({ message: 'מסמך נמחק בהצלחה' });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAllDocuments: RequestHandler = async (req, res, next) => {
  try {
    const documents = await DocumentModel.find().lean();

    const docsWithUrls = await Promise.all(documents.map(async (doc: any) => {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      return {
        ...doc,
        createdAt: doc.uploadedAt, // מיפוי uploadedAt ל-createdAt
        updatedAt: doc.uploadedAt  // מיפוי uploadedAt ל-updatedAt
      };
    }));

    res.json(docsWithUrls);

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAllPersonalDocuments: RequestHandler = async (req, res, next) => {
  try {
    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות',
      'אישור וותק'
    ];
    const documents: Document[] = await DocumentModel.find({ tag: { $in: personalDocTags } }).lean();
    for (const doc of documents as any[]) {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      doc.createdAt = doc.uploadedAt; // מיפוי uploadedAt ל-createdAt
      doc.updatedAt = doc.uploadedAt;  // מיפוי uploadedAt ל-updatedAt
    }
    
    res.status(200).json(documents);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getCoordinatorWorkerDocuments: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    const { coordinatorId } = req.params;
    
    // בדיקה שהמשתמש הוא רכז או מנהל
    if (req.user?.role !== 'coordinator' && req.user?.role !== 'admin' && req.user?.role !== 'manager_project' && req.user?.role !== 'accountant') {
      res.status(403).json({ error: 'אין לך הרשאה לגשת למסמכים אלה' });
      return;
    }

    // אם המשתמש הוא רכז, וודא שהוא מנסה לגשת למסמכים של העובדים שלו
    if (req.user?.role === 'coordinator' && req.user?.id !== coordinatorId) {
      res.status(403).json({ error: 'אין לך הרשאה לגשת למסמכים של רכז אחר' });
      return;
    }

    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות',
      'אישור וותק'
    ];

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
    const Class = require('../models/Class').default;
    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes }
    });

    // יצירת רשימת עובדים עם פרטי הכיתה
    const workersWithClassInfo: any[] = [];
    classes.forEach((cls: any) => {
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
    const WorkerAfterNoonModel = require('../models/WorkerAfterNoon').default;
    const workers = await WorkerAfterNoonModel.find({
      _id: { $in: workerIds },
      isActive: true
    }).sort({ lastName: 1, firstName: 1 });

    if (!workers || workers.length === 0) {
      res.status(200).json([]);
      return;
    }

    const activeWorkerIds = workers.map((worker: any) => worker._id);

    // קבלת כל המסמכים האישיים של העובדים
    const documents: Document[] = await DocumentModel.find({ 
      operatorId: { $in: activeWorkerIds },
      tag: { $in: personalDocTags }
    }).lean();

    // הוספת URLs למסמכים
    for (const doc of documents as any[]) {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      doc.createdAt = doc.uploadedAt; // מיפוי uploadedAt ל-createdAt
      doc.updatedAt = doc.uploadedAt;  // מיפוי uploadedAt ל-updatedAt
    }
    
    res.status(200).json(documents);
  } catch (err: unknown) {
    console.error('Error in getCoordinatorWorkerDocuments:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const cleanupUndefinedTags: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    // בדיקה שהמשתמש הוא מנהל
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager_project') {
      res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
      return;
    }

    // מצא מסמכים עם תג undefined או ריק
    const documentsToDelete = await DocumentModel.find({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
        { tag: { $regex: /^\s*$/ } } // תגים עם רווחים בלבד
      ]
    });

    if (documentsToDelete.length === 0) {
      res.json({ message: 'אין מסמכים עם תג undefined לניקוי', count: 0 });
      return;
    }

    // מחק את המסמכים מ-S3
    for (const doc of documentsToDelete) {
      try {
        await deleteFileFromS3(doc.s3Key as string);
      } catch (error) {
        console.error(`Error deleting file from S3: ${doc.s3Key}`, error);
      }
    }

    // מחק את המסמכים מהמסד נתונים
    const deleteResult = await DocumentModel.deleteMany({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
        { tag: { $regex: /^\s*$/ } }
      ]
    });

    res.json({ 
      message: `נוקו ${deleteResult.deletedCount} מסמכים עם תג undefined`,
      count: deleteResult.deletedCount,
      deletedDocuments: documentsToDelete.map(doc => ({
        id: doc._id,
        fileName: doc.fileName,
        tag: doc.tag
      }))
    });
  } catch (err: unknown) {
    console.error('Error in cleanupUndefinedTags:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};
