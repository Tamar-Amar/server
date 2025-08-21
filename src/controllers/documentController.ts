import { Request, RequestHandler } from 'express';
import DocumentModel, { Document, DocumentStatus, DocumentType } from '../models/Document';
import { uploadFileToS3, deleteFileFromS3, getSignedUrl, getFileFromS3 } from '../services/s3Service';
import { Types } from 'mongoose';
import * as archiver from 'archiver';


interface RequestWithUser extends Request {
  user?: { id: string; role: string; idNumber?: string; username?: string };
  file?: Express.Multer.File;
}

const generateFileName = (tz: string, documentType: string, originalName: string): string => {
  const date = new Date().toISOString().split('T')[0];
  const baseName = `${tz}-${date}`;
  
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





export const uploadDocument: RequestHandler = async (req: RequestWithUser, res, next) => {
  
  try {
    if (!req.file) {
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }
    
    if (!req.body.workerId || !req.body.documentType || !req.body.tz) {
      res.status(400).json({ error: 'חסרים שדות חובה: workerId, documentType, או tz' });
      return;
    }

    const { workerId, documentType, expiryDate, tz } = req.body;
    const { buffer, mimetype, size } = req.file;

    if (!workerId || !documentType) {
      res.status(400).json({ error: 'חסרים פרטים חובה' });
      return;
    }

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
        tag: documentType.trim(),
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
          createdAt: docObj.uploadedAt,
          updatedAt: docObj.uploadedAt
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
    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות',
      'אישור וותק',
      'נוכחות קייטנה רכז',
      'אישור רפואי'
    ];
    const documents: Document[] = await DocumentModel.find({ tag: { $in: personalDocTags } }).lean();
    for (const doc of documents as any[]) {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      doc.createdAt = doc.uploadedAt;
      doc.updatedAt = doc.uploadedAt;
    }

    
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
    
    if (req.user?.role !== 'coordinator' && req.user?.role !== 'admin' && req.user?.role !== 'manager_project' && req.user?.role !== 'accountant') {
      res.status(403).json({ error: 'אין לך הרשאה לגשת למסמכים אלה' });
      return;
    }

    if (req.user?.role === 'coordinator' && req.user?.id !== coordinatorId) {
      res.status(403).json({ error: 'אין לך הרשאה לגשת למסמכים של רכז אחר' });
      return;
    }

    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות',
      'אישור וותק',
      'נוכחות קייטנה רכז',
      'אישור רפואי'
    ];

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
    
    const Class = require('../models/Class').default;
    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes }
    });

    const workersWithClassInfo: any[] = [];
    classes.forEach((cls: any) => {
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
              roleName: worker.roleName
            });
          }
        });
      }
    });

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

    const documents: Document[] = await DocumentModel.find({ 
      operatorId: { $in: activeWorkerIds },
      tag: { $in: personalDocTags }
    }).lean();

    for (const doc of documents as any[]) {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      doc.createdAt = doc.uploadedAt;
      doc.updatedAt = doc.uploadedAt;
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
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager_project') {
      res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
      return;
    }

    const documentsToDelete = await DocumentModel.find({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
          { tag: { $regex: /^\s*$/ } }
      ]
    });

    if (documentsToDelete.length === 0) {
      res.json({ message: 'אין מסמכים עם תג undefined לניקוי', count: 0 });
      return;
    }

    for (const doc of documentsToDelete) {
      try {
        await deleteFileFromS3(doc.s3Key as string);
      } catch (error) {
        console.error(`Error deleting file from S3: ${doc.s3Key}`, error);
      }
    }

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


export const getDocumentStats: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
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
    req.setTimeout(600000); // 10 דקות
    res.setTimeout(600000); // 10 דקות 
    
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
      projectOrganization = 'byClass',
      batchSize = 500,
      batchIndex = 0
    } = req.body;

    let filter: any = {};

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds.map((id: string) => new Types.ObjectId(id)) };
    } else {
      if (documentType === 'personal') {
        const personalDocTypes = [
          'תעודת זהות', 'אישור משטרה', 'חוזה', 'תעודת השכלה', 
          'אישור וותק', 'אישור רפואי'
        ];
        filter.tag = { $in: personalDocTypes };
      } else if (documentType === 'project' && selectedProject) {
        filter.projectCode = parseInt(selectedProject);
      } else {
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
      const AttendanceDocumentModel = require('../models/AttendanceDocument').default;
      attendanceDocs = await AttendanceDocumentModel.find(filter).lean();
      
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
    
    console.log(`📊 נמצאו ${documents.length} מסמכים בסך הכל`);

    if (documents.length === 0) {
      res.status(404).json({ error: 'לא נמצאו מסמכים להורדה' });
      return;
    }

    const archive = archiver.create('zip', {
      zlib: { level: 9 } 
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="documents-batch-${batchIndex + 1}-${timestamp}.zip"`);
    
    archive.pipe(res);
    
    // טיפול בשגיאות של ה-stream
    archive.on('error', (err) => {
      console.error('❌ שגיאה ב-archive stream:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'שגיאה ביצירת קובץ ZIP' });
      }
    });
    
    // טיפול בשגיאות של ה-response
    res.on('error', (err) => {
      console.error('❌ שגיאה ב-response stream:', err);
    });

    const maxDocuments = req.body.maxDocuments || 1000; 
    const documentsToProcess = documents.slice(0, maxDocuments);
    
    console.log(`📦 יוצר ZIP batch ${batchIndex + 1} עם ${documentsToProcess.length} מסמכים`);
    
    if (documentsToProcess.length === 0) {
      res.status(404).json({ error: 'לא נמצאו מסמכים להורדה' });
      return;
    }
    
    // הגדרת headers עם מידע על ה-batch
    res.setHeader('X-Total-Documents', documentsToProcess.length.toString());
    res.setHeader('X-Batch-Size', batchSize.toString());
    res.setHeader('X-Current-Batch', (batchIndex + 1).toString());
    res.setHeader('X-Total-Batches', Math.ceil(documentsToProcess.length / batchSize).toString());
    res.setHeader('X-Batch-Documents', documentsToProcess.length.toString());
    
    
    let classMap = new Map();
    if (documentType === 'project') {
      const ClassModel = require('../models/Class').default;
      const classIds = [...new Set(documentsToProcess.map(doc => doc.classId).filter(Boolean))];
      
      if (classIds.length > 0) {
        const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();
        classes.forEach((cls: any) => {
          classMap.set(cls._id.toString(), cls.uniqueSymbol || 'כיתה_לא_מוגדרת');
        });
      } 
    }
    
    let processedCount = 0;
    for (const doc of documentsToProcess) {
      processedCount++;
      if (processedCount % 10 === 0) {

      }
      try {

        let fileBuffer;
        try {
          fileBuffer = await getFileFromS3(doc.s3Key as string);
        } catch (error) {
          console.error(`❌ שגיאה בהורדת קובץ מ-S3: ${doc.s3Key}`, error);
          continue; // נמשיך עם הקובץ הבא
        }
        let workerName = 'לא ידוע';
        let workerId = 'לא ידוע';
        
        if (documentType === 'project' && doc.classId) {
          const classSymbol = classMap.get(doc.classId.toString()) || 'כיתה_לא_מוגדרת';
          workerName = classSymbol;
          workerId = classSymbol;
        } else if (doc.operatorId && typeof doc.operatorId === 'object') {
          const operator = doc.operatorId as any;
          if (operator.firstName && operator.lastName) {
            workerName = `${operator.lastName} ${operator.firstName}`; 
            workerId = operator.idNumber || 'לא ידוע';
          }
        }
        let fileName = doc.fileName as string;
        if (!fileName.includes('.')) {
          const extension = getFileExtension(doc.fileType as string);
          fileName = `${doc.fileName}${extension}`;
        }
        
        let organizedFileName = fileName;
        
        const lastDotIndex = fileName.lastIndexOf('.');
        const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
        
        if (fileNameFormat === 'simple') {
          const cleanWorkerName = workerName.replace(/\s+/g, '_');
          const cleanDocType = doc.tag.replace(/\s+/g, '_');
          organizedFileName = `${cleanWorkerName}_${cleanDocType}${extension}`;
        } else {
          const cleanWorkerId = workerId.replace(/\s+/g, '_');
          const cleanWorkerName = workerName.replace(/\s+/g, '_');
          const cleanDocType = doc.tag.replace(/\s+/g, '_');
          const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('he-IL').replace(/\//g, '-');
          organizedFileName = `${cleanWorkerId}_${cleanWorkerName}_${cleanDocType}_${uploadDate}${extension}`;
        }
        
        let fullPath: string;
        
        if (documentType === 'project' && projectOrganization === 'byClass') {

          const classSymbol = doc.classId ? classMap.get(doc.classId.toString()) || 'כיתה_לא_מוגדרת' : 'כיתה_לא_מוגדרת';
          fullPath = `${classSymbol}/${organizedFileName}`;
        } else if (documentType === 'project' && projectOrganization === 'byType') {

          let attendanceType = 'נוכחות_כללית';
          
          if (doc.tag === 'נוכחות עובדים' || doc.type === 'נוכחות עובדים') {
            attendanceType = 'נוכחות_עובדים';
          } else if (doc.tag === 'נוכחות תלמידים' || doc.type === 'נוכחות תלמידים') {
            attendanceType = 'נוכחות_תלמידים';
          } else if (doc.tag === 'בקרה' || doc.type === 'בקרה') {
            attendanceType = 'נוכחות_בקרה';
          }
          
          fullPath = `${attendanceType}/${organizedFileName}`;
        } else if (organizationType === 'byType') {
          fullPath = `${doc.tag}/${organizedFileName}`;
        } else {
          fullPath = `${workerName}/${organizedFileName}`;
        }
        
        if (documentType === 'project' && !doc.s3Key) {
          continue;
        }

                try {
          archive.append(fileBuffer, { name: fullPath });
        } catch (error) {
          console.error(`❌ שגיאה בהוספת קובץ ${doc.fileName} ל-ZIP:`, error);
          // נמשיך עם הקובץ הבא במקום לעצור הכל
        }
      } catch (error) {
        console.error(`❌ שגיאה בעיבוד מסמך ${doc.fileName}:`, error);
        // נמשיך עם הקובץ הבא במקום לעצור הכל
      }
      }
        
        try {
          await archive.finalize();
        } catch (error) {
          console.error('❌ שגיאה ב-finalize של ה-ZIP:', error);
          // אם יש שגיאה, נשלח תגובת שגיאה
          if (!res.headersSent) {
            res.status(500).json({ error: 'שגיאה ביצירת קובץ ZIP' });
          }
          return;
        }

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
    const documents = await DocumentModel.find({
      _id: { $in: documentIds.map((id: string) => new Types.ObjectId(id)) }
    });

    for (const doc of documents) {
      try {
        await deleteFileFromS3(doc.s3Key as string);
      } catch (error) {
        console.error(`Error deleting file from S3: ${doc.s3Key}`, error);
      }
    }

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
    const { projectCode } = req.params;

    if (!projectCode) {
      res.status(400).json({ error: 'קוד פרויקט נדרש' });
      return;
    }

    const AttendanceDocumentModel = require('../models/AttendanceDocument').default;
    
    const documents = await AttendanceDocumentModel.find({ 
      projectCode: parseInt(projectCode) 
    }).lean();
    

    res.json({ documents });
  } catch (err: unknown) {
    console.error('❌ שגיאה ב-getAttendanceDocuments:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};



