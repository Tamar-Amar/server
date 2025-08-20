import { Request, RequestHandler } from 'express';
import DocumentModel, { Document, DocumentStatus, DocumentType } from '../models/Document';
import { uploadFileToS3, deleteFileFromS3, getSignedUrl, getFileFromS3 } from '../services/s3Service';
import { Types } from 'mongoose';
import * as archiver from 'archiver';
import { Readable } from 'stream';


interface RequestWithUser extends Request {
  user?: { id: string; role: string; idNumber?: string; username?: string };
  file?: Express.Multer.File;
}

const generateFileName = (tz: string, documentType: string, originalName: string): string => {
  const date = new Date().toISOString().split('T')[0];
  const baseName = `${tz}-${date}`;
  
  // חילוץ הסיומת מהשם המקורי
  const lastDotIndex = originalName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';
  
  return `${baseName}${extension}`;
};

const getFileExtension = (mimeType: string): string => {
  const mimeToExt: { [key: string]: string } = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip'
  };
  
  return mimeToExt[mimeType] || '.bin';
};

const getAttendanceType = (fileName: string): string => {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('עובד') || lowerFileName.includes('staff') || lowerFileName.includes('worker')) {
    return 'נוכחות_עובדים';
  } else if (lowerFileName.includes('תלמיד') || lowerFileName.includes('student') || lowerFileName.includes('child')) {
    return 'נוכחות_תלמידים';
  } else if (lowerFileName.includes('בקרה') || lowerFileName.includes('supervision') || lowerFileName.includes('control')) {
    return 'נוכחות_בקרה';
  } else {
    return 'נוכחות_כללית';
  }
};

const getAttendanceTypeFromContext = (docId: string, attendanceDocs: any[]): string => {
  for (const doc of attendanceDocs) {
    if (doc._id.toString() === docId) {
      switch (doc.type) {
        case 'נוכחות עובדים':
          return 'נוכחות_עובדים';
        case 'נוכחות תלמידים':
          return 'נוכחות_תלמידים';
        case 'מסמך בקרה':
          return 'נוכחות_בקרה';
        default:
          return 'נוכחות_כללית';
      }
    }
  }
  return 'נוכחות_כללית';
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
      const newFileName = generateFileName(tz, documentType, req.file.originalname);
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

    const docsWithDates = documents.map((doc: any) => ({
      ...doc,
      createdAt: doc.uploadedAt, // מיפוי uploadedAt ל-createdAt
      updatedAt: doc.uploadedAt  // מיפוי uploadedAt ל-updatedAt
    }));

    res.json(docsWithDates);

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAllPersonalDocuments: RequestHandler = async (req, res, next) => {
  try {
    console.log('🚀 getAllPersonalDocuments - מתחיל...');
    
    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות',
      'אישור וותק'
    ];
    
    console.log('🔍 מחפש מסמכים עם תגים:', personalDocTags);
    const documents: Document[] = await DocumentModel.find({ tag: { $in: personalDocTags } }).lean();
    console.log('📄 מצאתי', documents.length, 'מסמכים');
    
    console.log('📝 מעדכן תאריכים...');
    for (const doc of documents as any[]) {
      doc.createdAt = doc.uploadedAt; // מיפוי uploadedAt ל-createdAt
      doc.updatedAt = doc.uploadedAt;  // מיפוי uploadedAt ל-updatedAt
    }
    
    console.log('✅ שולח תשובה עם', documents.length, 'מסמכים');
    res.status(200).json({ documents });
  } catch (err: unknown) {
    console.error('❌ שגיאה ב-getAllPersonalDocuments:', err);
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
      const workers = await WorkerAfterNoonModel.find({ 
        projectCodes: parseInt(project as string) 
      });
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
    // נחזיר סטטיסטיקות פשוטות בלי aggregation
    const totalDocuments = await DocumentModel.countDocuments();
    const documentsWithOperator = await DocumentModel.countDocuments({ 
      operatorId: { $exists: true, $ne: null } 
    });

    res.json({
      total: { totalDocuments, documentsWithOperator },
      byType: [],
      byStatus: [],
      byMonth: []
    });

  } catch (err: unknown) {
    console.error('Error in getDocumentStats:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const downloadMultipleDocuments: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    console.log('🚀 downloadMultipleDocuments - מתחיל...');
    console.log('📋 פרמטרים שהתקבלו:', req.body);
    
    // הגדרת timeout ארוך יותר
    req.setTimeout(300000); // 5 דקות
    res.setTimeout(300000); // 5 דקות
    
    const { 
      documentIds, 
      documentType, 
      status, 
      workerId, 
      project, 
      dateFrom, 
      dateTo,
      organizationType = 'byType',
      fileNameFormat = 'simple',
      selectedProject,
      projectOrganization = 'byClass'
    } = req.body;

    let filter: any = {};

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds.map((id: string) => new Types.ObjectId(id)) };
    } else {
      // לוגיקה חדשה לפי סוג מסמכים
      if (documentType === 'personal') {
        // מסמכים אישיים - כל המסמכים האישיים
        const personalDocTypes = [
          'תעודת זהות', 'אישור משטרה', 'חוזה', 'תעודת השכלה', 
          'אישור וותק', 'אישור רפואי'
        ];
        filter.tag = { $in: personalDocTypes };
      } else if (documentType === 'project' && selectedProject) {
        // מסמכי נוכחות פרויקט ספציפי - נשתמש באוסף attendance-documents
        filter.projectCode = parseInt(selectedProject);
      } else {
        // פילטרים רגילים
        if (documentType && documentType !== 'personal' && documentType !== 'project') {
          filter.tag = documentType;
        }
        if (status) filter.status = status;
        if (workerId) filter.operatorId = new Types.ObjectId(workerId);
        if (dateFrom || dateTo) {
          filter.uploadedAt = {};
          if (dateFrom) filter.uploadedAt.$gte = new Date(dateFrom);
          if (dateTo) filter.uploadedAt.$lte = new Date(dateTo);
        }
        if (project) {
          const WorkerAfterNoonModel = require('../models/WorkerAfterNoon').default;
          const workers = await WorkerAfterNoonModel.find({ 
            projectCodes: parseInt(project) 
          });
          const workerIds = workers.map((w: any) => w._id);
          filter.operatorId = { $in: workerIds };
        }
      }
    }

    let documents;
    let attendanceDocs: any[] = [];
    
    if (documentType === 'project' && selectedProject) {
      // עבור מסמכי נוכחות - נשתמש באוסף attendance-documents
      const AttendanceDocumentModel = require('../models/AttendanceDocument').default;
      attendanceDocs = await AttendanceDocumentModel.find(filter).lean();
      
      // המרה לפורמט אחיד
      documents = attendanceDocs.map((doc: any) => ({
        _id: doc._id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        size: doc.size || 0,
        s3Key: doc.s3Key,
        uploadedAt: doc.uploadedAt,
        tag: doc.type,
        status: doc.status,
        operatorId: {
          firstName: 'מסגרת',
          lastName: doc.classId || 'לא מוגדרת',
          project: doc.classId || 'לא מוגדרת'
        },
        projectCode: doc.projectCode,
        classId: doc.classId,
        month: doc.month,
        type: doc.type
      }));
    } else {
      // עבור מסמכים רגילים - נשתמש באוסף documents
      documents = await DocumentModel.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'workers-after-noon-collections',
            localField: 'operatorId',
            foreignField: '_id',
            as: 'worker'
          }
        },
        {
          $addFields: {
            operatorId: { $arrayElemAt: ['$worker', 0] }
          }
        },
        {
          $project: {
            worker: 0
          }
        }
      ]);
    }

    if (documents.length === 0) {
      res.status(404).json({ error: 'לא נמצאו מסמכים להורדה' });
      return;
    }

    // יצירת ZIP file עם כל המסמכים
    const archive = archiver.create('zip', {
      zlib: { level: 9 } // רמת דחיסה מקסימלית
    });

    // הגדרת headers להורדת ZIP
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="documents-${timestamp}.zip"`);
    
    // חיבור ה-archive ל-response
    archive.pipe(res);

    console.log('📄 מתחיל לעבד', documents.length, 'מסמכים...');
    
    // הגבלת מספר המסמכים לביצועים טובים יותר
    const maxDocuments = req.body.maxDocuments || 100; // ברירת מחדל 100
    const documentsToProcess = documents.slice(0, maxDocuments);
    
    if (documents.length > maxDocuments) {
      console.log(`⚠️ הגבלתי ל-${maxDocuments} מסמכים מתוך ${documents.length} לביצועים טובים יותר`);
    }
    
    // הוספת כל המסמכים ל-ZIP
    let processedCount = 0;
    for (const doc of documentsToProcess) {
      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`📊 עיבדתי ${processedCount}/${documentsToProcess.length} מסמכים...`);
      }
      try {
        console.log('📎 מעבד מסמך:', doc.fileName);
        const fileBuffer = await getFileFromS3(doc.s3Key as string);
        // מציאת שם העובד
        let workerName = 'לא ידוע';
        let workerId = 'לא ידוע';
        
        if (doc.operatorId && typeof doc.operatorId === 'object') {
          const operator = doc.operatorId as any;
          if (operator.firstName && operator.lastName) {
            workerName = `${operator.lastName} ${operator.firstName}`; // שם משפחה קודם
            workerId = operator.idNumber || 'לא ידוע';
          }
        }
        // וידוא שיש סיומת לקובץ
        let fileName = doc.fileName as string;
        if (!fileName.includes('.')) {
          // אם אין סיומת, נוסיף סיומת לפי סוג הקובץ
          const extension = getFileExtension(doc.fileType as string);
          fileName = `${doc.fileName}${extension}`;
        }
        
        // יצירת שם קובץ מאורגן
        let organizedFileName = fileName;
        
        // חילוץ הסיומת מהשם המקורי
        const lastDotIndex = fileName.lastIndexOf('.');
        const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
        
        // יצירת שם קובץ לפי הפורמט הנבחר
        if (fileNameFormat === 'simple') {
          // פורמט פשוט: שם_משפחה_שם_פרטי_סוג_מסמך
          const cleanWorkerName = workerName.replace(/\s+/g, '_');
          const cleanDocType = doc.tag.replace(/\s+/g, '_');
          organizedFileName = `${cleanWorkerName}_${cleanDocType}${extension}`;
        } else {
          // פורמט מפורט: תז_שם_משפחה_שם_פרטי_סוג_מסמך_תאריך
          const cleanWorkerId = workerId.replace(/\s+/g, '_');
          const cleanWorkerName = workerName.replace(/\s+/g, '_');
          const cleanDocType = doc.tag.replace(/\s+/g, '_');
          const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('he-IL').replace(/\//g, '-');
          organizedFileName = `${cleanWorkerId}_${cleanWorkerName}_${cleanDocType}_${uploadDate}${extension}`;
        }
        
        // יצירת נתיב קובץ לפי סוג הארגון
        let fullPath: string;
        
        if (documentType === 'project' && projectOrganization === 'byClass') {
          // ארגון לפי כיתה/מסגרת לפרויקט
          // נשתמש במספר הסמל הייחודי של הכיתה
          const classSymbol = doc.classId || 'כיתה_לא_מוגדרת';
          fullPath = `${classSymbol}/${organizedFileName}`;
        } else if (documentType === 'project' && projectOrganization === 'byType') {
          // ארגון לפי סוג נוכחות לפרויקט
          // נחלק לפי סוג הנוכחות (עובדים/תלמידים/בקרה)
          // נצטרך למצוא את סוג המסמך מהקשר ב-attendance-documents
          const attendanceType = getAttendanceTypeFromContext(doc._id, attendanceDocs);
          fullPath = `${attendanceType}/${organizedFileName}`;
        } else if (organizationType === 'byType') {
          // ארגון לפי סוג מסמך
          fullPath = `${doc.tag}/${organizedFileName}`;
        } else {
          // ארגון לפי עובד
          fullPath = `${workerName}/${organizedFileName}`;
        }
        
        // עבור מסמכי נוכחות, נצטרך לטפל בקבצים אחרת
        if (documentType === 'project' && !doc.s3Key) {
          // נדלג על מסמכים ללא s3Key
          continue;
        }
        
        console.log('✅ הוספתי לקובץ ZIP:', fullPath);
        archive.append(fileBuffer, { name: fullPath });
      } catch (error) {
        console.error(`❌ שגיאה בהוספת קובץ ${doc.fileName} ל-ZIP:`, error);
        // נמשיך עם שאר הקבצים גם אם אחד נכשל
      }
    }
    
    console.log('📦 סיימתי לעבד את כל המסמכים');

    console.log('📦 מסיים יצירת ZIP...');
    // סיום ה-ZIP
    await archive.finalize();
    console.log('✅ ZIP הושלם בהצלחה');

  } catch (err: unknown) {
    console.error('❌ שגיאה ב-downloadMultipleDocuments:', err);
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
    // נחזיר רשימה קבועה של סוגי מסמכים
    const types = [
      'תעודת זהות',
      'אישור משטרה', 
      'חוזה',
      'תעודת השכלה',
      'אישור וותק',
      'אישור רפואי',
      'נוכחות קייטנה רכז'
    ];
    res.json(types);
  } catch (err: unknown) {
    console.error('Error in getDocumentTypes:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAttendanceDocuments: RequestHandler = async (req, res, next) => {
  try {
    console.log('🚀 getAttendanceDocuments - מתחיל...');
    const { projectCode } = req.params;
    console.log('📋 קוד פרויקט:', projectCode);
    
    if (!projectCode) {
      console.log('❌ קוד פרויקט חסר');
      res.status(400).json({ error: 'קוד פרויקט נדרש' });
      return;
    }

    console.log('📚 טוען מודל AttendanceDocument...');
    const AttendanceDocumentModel = require('../models/AttendanceDocument').default;
    
    console.log('🔍 מחפש מסמכי נוכחות עבור פרויקט:', projectCode);
    const documents = await AttendanceDocumentModel.find({ 
      projectCode: parseInt(projectCode) 
    }).lean();
    
    console.log('📄 מצאתי', documents.length, 'מסמכי נוכחות');
    console.log('✅ שולח תשובה');

    res.json({ documents });
  } catch (err: unknown) {
    console.error('❌ שגיאה ב-getAttendanceDocuments:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};


