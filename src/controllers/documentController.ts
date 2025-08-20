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
  try {
    if (!req.file) {
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }
    if (!req.body.operatorId || !req.body.tag || !req.body.documentType || !req.body.tz) {

      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }

    const { workerId, documentType, expiryDate, tz } = req.body;
    const { buffer, mimetype, size } = req.file;

    if (!workerId || !documentType) {
      res.status(400).json({ error: 'חסרים פרטים חובה' });
      return;
    }

    // בדיקה נוספת ש-documentType לא undefined או ריק
    if (!documentType || documentType === 'undefined' || documentType.trim() === '') {
      res.status(400).json({ error: 'סוג מסמך לא תקין או חסר' });
      return;
    }

    try {
      const operatorId = new Types.ObjectId(workerId);
      const newFileName = generateFileName(tz, documentType);
      const s3Key = await uploadFileToS3(buffer, newFileName, mimetype);

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
              roleName: worker.roleName
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

// פונקציות חדשות לניהול מסמכים מתקדם

export const getDocumentsWithFilters: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    const { 
      documentType, 
      status, 
      workerId, 
      project, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50,
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = req.query;

    // בניית פילטר
    const filter: any = {};

    if (documentType) {
      filter.tag = documentType;
    }

    if (status) {
      filter.status = status;
    }

    if (workerId) {
      filter.operatorId = new Types.ObjectId(workerId as string);
    }

    if (dateFrom || dateTo) {
      filter.uploadedAt = {};
      if (dateFrom) {
        filter.uploadedAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        filter.uploadedAt.$lte = new Date(dateTo as string);
      }
    }

    // אם יש פרויקט, נצטרך לבדוק את העובדים של הפרויקט
    if (project) {
      const WorkerAfterNoonModel = require('../models/WorkerAfterNoon').default;
      const workers = await WorkerAfterNoonModel.find({ project: project as string });
      const workerIds = workers.map((w: any) => w._id);
      filter.operatorId = { $in: workerIds };
    }

    // ספירה כוללת
    const totalCount = await DocumentModel.countDocuments(filter);

    // קבלת מסמכים עם pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const documents = await DocumentModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('operatorId', 'firstName lastName idNumber project')
      .lean();

    // הוספת URLs למסמכים
    const docsWithUrls = await Promise.all(documents.map(async (doc: any) => {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      doc.createdAt = doc.uploadedAt;
      doc.updatedAt = doc.uploadedAt;
      return doc;
    }));

    res.json({
      documents: docsWithUrls,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalCount,
        hasNext: Number(page) * Number(limit) < totalCount,
        hasPrev: Number(page) > 1
      }
    });

  } catch (err: unknown) {
    console.error('Error in getDocumentsWithFilters:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getDocumentStats: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    // סטטיסטיקות לפי סוג מסמך
    const statsByType = await DocumentModel.aggregate([
      {
        $group: {
          _id: '$tag',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // סטטיסטיקות לפי סטטוס
    const statsByStatus = await DocumentModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // סטטיסטיקות לפי חודש
    const statsByMonth = await DocumentModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$uploadedAt' },
            month: { $month: '$uploadedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // סך הכל
    const totalStats = await DocumentModel.aggregate([
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' }
        }
      }
    ]);

    res.json({
      byType: statsByType,
      byStatus: statsByStatus,
      byMonth: statsByMonth,
      total: totalStats[0] || { totalDocuments: 0, totalSize: 0, avgSize: 0 }
    });

  } catch (err: unknown) {
    console.error('Error in getDocumentStats:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const downloadMultipleDocuments: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    const { documentIds, documentType, status, workerId, project, dateFrom, dateTo } = req.body;

    let filter: any = {};

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds.map((id: string) => new Types.ObjectId(id)) };
    } else {
      // בניית פילטר כמו ב-getDocumentsWithFilters
      if (documentType) filter.tag = documentType;
      if (status) filter.status = status;
      if (workerId) filter.operatorId = new Types.ObjectId(workerId);
      if (dateFrom || dateTo) {
        filter.uploadedAt = {};
        if (dateFrom) filter.uploadedAt.$gte = new Date(dateFrom);
        if (dateTo) filter.uploadedAt.$lte = new Date(dateTo);
      }
      if (project) {
        const WorkerAfterNoonModel = require('../models/WorkerAfterNoon').default;
        const workers = await WorkerAfterNoonModel.find({ project });
        const workerIds = workers.map((w: any) => w._id);
        filter.operatorId = { $in: workerIds };
      }
    }

    const documents = await DocumentModel.find(filter)
      .populate('operatorId', 'firstName lastName idNumber project')
      .lean();

    if (documents.length === 0) {
      res.status(404).json({ error: 'לא נמצאו מסמכים להורדה' });
      return;
    }

    // יצירת URLs להורדה
    const downloadUrls = await Promise.all(documents.map(async (doc: any) => {
      const url = await getSignedUrl(doc.s3Key as string);
      return {
        id: doc._id,
        fileName: doc.fileName,
        tag: doc.tag,
        status: doc.status,
        workerName: doc.operatorId ? `${doc.operatorId.firstName} ${doc.operatorId.lastName}` : 'לא ידוע',
        workerId: doc.operatorId?.idNumber || 'לא ידוע',
        project: doc.operatorId?.project || 'לא ידוע',
        downloadUrl: url,
        uploadedAt: doc.uploadedAt
      };
    }));

    res.json({
      documents: downloadUrls,
      count: downloadUrls.length,
      message: `מוכנים ${downloadUrls.length} מסמכים להורדה`
    });

  } catch (err: unknown) {
    console.error('Error in downloadMultipleDocuments:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const bulkUpdateDocumentStatus: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    const { documentIds, status, comments } = req.body;

    if (!documentIds || documentIds.length === 0) {
      res.status(400).json({ error: 'לא נבחרו מסמכים לעדכון' });
      return;
    }

    const updateData: any = { status };
    if (comments !== undefined) {
      updateData.comments = comments;
    }

    const result = await DocumentModel.updateMany(
      { _id: { $in: documentIds.map((id: string) => new Types.ObjectId(id)) } },
      updateData
    );

    res.json({
      message: `עודכנו ${result.modifiedCount} מסמכים בהצלחה`,
      modifiedCount: result.modifiedCount
    });

  } catch (err: unknown) {
    console.error('Error in bulkUpdateDocumentStatus:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const bulkDeleteDocuments: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    const { documentIds } = req.body;

    if (!documentIds || documentIds.length === 0) {
      res.status(400).json({ error: 'לא נבחרו מסמכים למחיקה' });
      return;
    }

    // קבלת המסמכים לפני מחיקה
    const documents = await DocumentModel.find({
      _id: { $in: documentIds.map((id: string) => new Types.ObjectId(id)) }
    });

    // מחיקה מ-S3
    for (const doc of documents) {
      try {
        await deleteFileFromS3(doc.s3Key as string);
      } catch (error) {
        console.error(`Error deleting file from S3: ${doc.s3Key}`, error);
      }
    }

    // מחיקה מהמסד נתונים
    const result = await DocumentModel.deleteMany({
      _id: { $in: documentIds.map((id: string) => new Types.ObjectId(id)) }
    });

    res.json({
      message: `נמחקו ${result.deletedCount} מסמכים בהצלחה`,
      deletedCount: result.deletedCount
    });

  } catch (err: unknown) {
    console.error('Error in bulkDeleteDocuments:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getDocumentTypes: RequestHandler = async (req, res, next) => {
  try {
    const types = await DocumentModel.distinct('tag');
    res.json(types.filter(type => type && type !== 'undefined'));
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};
