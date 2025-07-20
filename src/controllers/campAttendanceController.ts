import { RequestHandler, Request, Response } from 'express';
import CampAttendance from '../models/CampAttendance';
import AttendanceDocument from '../models/AttendanceDocument';
import { uploadFileToS3, deleteFileFromS3 } from '../services/s3Service';
import fs from 'fs';
import { getSignedUrl } from '../services/s3Service';
import { Types } from 'mongoose';

interface RequestWithUser extends Request {
  user?: { 
    id: string;
    role: string;
    username: string;
  };
  files?: any;
}

function logErrorToFile(message: string) {
  const logMsg = `[${new Date().toISOString()}] ${message}\n`;
  try {
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    fs.appendFileSync('logs/campAttendance.log', logMsg);
  } catch (e) {
    console.error('שגיאה בכתיבת לוג:', e);
  }
}

export const createCampAttendance: RequestHandler = async (req, res) => {
  try {
    // הדפסת טיפוסים וערכים
    Object.entries(req.body).forEach(([k, v]) => {
      console.log(`שדה ${k}:`, v, '| טיפוס:', typeof v);
    });
    const { projectCode, classId, coordinatorId, leaderId, month, workerAttendanceDoc, studentAttendanceDoc, controlDocs } = req.body;
    
    // בדיקה אם השדות החובה קיימים (אפילו אם ריקים)
    if (!projectCode || !classId || !coordinatorId || !leaderId || !month) {
      logErrorToFile('חסר שדה חובה! ' + JSON.stringify({ projectCode, classId, coordinatorId, leaderId, month }));
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }
    
    const campAttendance = await CampAttendance.create({
      projectCode,
      classId,
      coordinatorId,
      leaderId,
      month,
      workerAttendanceDoc: workerAttendanceDoc || null,
      studentAttendanceDoc: studentAttendanceDoc || null,
      controlDocs: controlDocs || []
    });
    res.status(201).json(campAttendance);
    return;
  } catch (err: any) {
    logErrorToFile('שגיאה ביצירת CampAttendance: ' + (err?.message || err) + ' | req.body: ' + JSON.stringify(req.body));
    res.status(500).json({ error: err.message });
    return;
  }
};

// פונקציה חדשה לשליפת דוחות campAttendance
export const getCampAttendance: RequestHandler = async (req, res) => {
  try {
    console.log("Starting getCampAttendance...");
    
    const campAttendances = await CampAttendance.find()
      .populate({
        path: 'classId',
        select: 'name uniqueSymbol type address street streetNumber projectCodes education gender institutionName institutionCode hasAfternoonCare monthlyBudget childresAmount isActive description'
      })
      .populate({
        path: 'coordinatorId',
        select: 'firstName lastName username role email phone isActive projectCodes'
      })
      .populate({
        path: 'leaderId',
        select: 'firstName lastName id accountantCode modelCode projectCodes roleName phone email isActive'
      })
      .populate({
        path: 'workerAttendanceDoc',
        select: 'fileName fileType s3Key uploadedAt status comments tz type'
      })
      .populate({
        path: 'studentAttendanceDoc',
        select: 'fileName fileType s3Key uploadedAt status comments tz type'
      })
      .populate({
        path: 'controlDocs',
        select: 'fileName fileType s3Key uploadedAt status comments tz type'
      });
    
    console.log("Found", campAttendances.length, "records");
    console.log("First record raw:", campAttendances[0]);
    console.log("First record workerAttendanceDoc raw:", campAttendances[0]?.workerAttendanceDoc);
    
    // הוספת URL חתום לכל מסמך
    const campAttendancesWithUrls = await Promise.all(
      campAttendances.map(async (record) => {
        const recordObj = record.toObject();
        
        // פונקציה עזר להוספת URL למסמך
        const addUrlToDoc = async (doc: any) => {
          if (doc && doc.s3Key) {
            try {
              const url = await getSignedUrl(doc.s3Key);
              return { ...doc, url };
            } catch (error) {
              return { ...doc, url: null };
            }
          }
          return doc;
        };
        
        // הוספת URL לכל המסמכים
        recordObj.workerAttendanceDoc = await addUrlToDoc(recordObj.workerAttendanceDoc);
        recordObj.studentAttendanceDoc = await addUrlToDoc(recordObj.studentAttendanceDoc);
        recordObj.controlDocs = await Promise.all(recordObj.controlDocs?.map(addUrlToDoc) || []);

        console.log("recordObj",recordObj);
        
        return recordObj;
      })
    );
    
    console.log("Sending response with", campAttendancesWithUrls.length, "records");
    res.status(200).json(campAttendancesWithUrls);
    return;
  } catch (err: any) {
    logErrorToFile('שגיאה בשליפת CampAttendance: ' + (err?.message || err) + ' | req.query: ' + JSON.stringify(req.query));
    res.status(500).json({ error: err.message });
    return;
  }
}; 

// פונקציה לעדכון דוח CampAttendance עם מסמך חדש
export const updateCampAttendanceDoc: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { docType, documentId } = req.body;
    
    if (!id || !docType || !documentId) {
      logErrorToFile('חסר שדה חובה ב-updateCampAttendanceDoc: ' + JSON.stringify({ id, docType, documentId }));
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }
    
    // בדיקה שהדוח קיים
    const campAttendance = await CampAttendance.findById(id);
    if (!campAttendance) {
      logErrorToFile('לא נמצא דוח CampAttendance עם ID: ' + id);
      res.status(404).json({ error: 'דוח לא נמצא' });
      return;
    }
    
    // עדכון השדה המתאים
    let updateData: any = {};
    
    if (docType === 'workerAttendanceDoc') {
      updateData.workerAttendanceDoc = documentId;
    } else if (docType === 'studentAttendanceDoc') {
      updateData.studentAttendanceDoc = documentId;
    } else if (docType === 'controlDocs') {
      // הוספה למערך controlDocs
      updateData.$push = { controlDocs: documentId };
    } else {
      logErrorToFile('סוג מסמך לא תקין: ' + docType);
      res.status(400).json({ error: 'סוג מסמך לא תקין' });
      return;
    }
    
    // עדכון הדוח
    const updatedCampAttendance = await CampAttendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('classId')
     .populate('coordinatorId')
     .populate('leaderId')
     .populate('workerAttendanceDoc')
     .populate('studentAttendanceDoc')
     .populate('controlDocs');

    res.status(200).json(updatedCampAttendance);
    return;
    
  } catch (err: any) {
    logErrorToFile('שגיאה בעדכון CampAttendance: ' + (err?.message || err) + ' | req.body: ' + JSON.stringify(req.body));
    res.status(500).json({ error: err.message });
    return;
  }
}; 

export const  createCampAttendanceWithFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      projectCode, 
      classId, 
      coordinatorId, 
      leaderId, 
      month 
    } = req.body;

    // בדיקת שדות חובה
    if (!projectCode || !classId || !coordinatorId || !leaderId || !month) {
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }

    // בדיקה שיש לפחות קובץ אחד
    const files = req.files as any;
    if (!files || (!files.workerFile && !files.studentFile && (!files.controlFiles || files.controlFiles.length === 0))) {
      res.status(400).json({ error: 'יש להעלות לפחות מסמך אחד' });
      return;
    }

    // העלאת קבצים ל-S3 ויצירת מסמכי נוכחות
    const uploadedDocs: any[] = [];

    // העלאת דוח עובדים
    if (files.workerFile) {
      const workerFile = Array.isArray(files.workerFile) ? files.workerFile[0] : files.workerFile;
      const fileName = `נוכחות עובדים - ${month}`;
      const s3Key = await uploadFileToS3(workerFile.buffer, fileName, workerFile.mimetype);
      
      const workerDoc = await AttendanceDocument.create({
        operatorId: new Types.ObjectId(leaderId),
        classId: new Types.ObjectId(classId),
        projectCode: parseInt(projectCode),
        month,
        type: 'נוכחות עובדים',
        fileName: fileName,
        fileType: workerFile.mimetype,
        s3Key,
        uploadedAt: new Date(),
        status: 'ממתין',
        tz: leaderId,
        uploadedBy: (req as any).user?.id ? new Types.ObjectId((req as any).user.id as string) : undefined
      });
       
      uploadedDocs.push({ type: 'workerAttendanceDoc', docId: workerDoc._id });
    }

    // העלאת דוח תלמידים
    if (files.studentFile) {
      const studentFile = Array.isArray(files.studentFile) ? files.studentFile[0] : files.studentFile;
      const fileName = `נוכחות תלמידים - ${month}`;
      const s3Key = await uploadFileToS3(studentFile.buffer, fileName, studentFile.mimetype);
      
      const studentDoc = await AttendanceDocument.create({
        operatorId: new Types.ObjectId(leaderId),
        classId: new Types.ObjectId(classId),
        projectCode: parseInt(projectCode),
        month,
        type: 'נוכחות תלמידים',
        fileName: fileName,
        fileType: studentFile.mimetype,
        s3Key,
        uploadedAt: new Date(),
        status: 'ממתין',
        tz: leaderId,
        uploadedBy: (req as any).user?.id ? new Types.ObjectId((req as any).user.id as string) : undefined
      });
      
      uploadedDocs.push({ type: 'studentAttendanceDoc', docId: studentDoc._id });
    }

    // העלאת דוחות בקרה
    const controlDocIds: Types.ObjectId[] = [];
    if (files.controlFiles) {
      const controlFiles = Array.isArray(files.controlFiles) ? files.controlFiles : [files.controlFiles];
      
      for (let i = 0; i < controlFiles.length; i++) {
        const controlFile = controlFiles[i];
        const fileName = `מסמך בקרה ${i + 1} - ${month}`;
        const s3Key = await uploadFileToS3(controlFile.buffer, fileName, controlFile.mimetype);
        
        const controlDoc = await AttendanceDocument.create({
          operatorId: new Types.ObjectId(leaderId),
          classId: new Types.ObjectId(classId),
          projectCode: parseInt(projectCode),
          month,
          type: 'מסמך בקרה',
          fileName: fileName,
          fileType: controlFile.mimetype,
          s3Key,
          uploadedAt: new Date(),
          status: 'ממתין',
          tz: leaderId,
          uploadedBy: (req as any).user?.id ? new Types.ObjectId((req as any).user.id as string) : undefined
        });
        
        controlDocIds.push(controlDoc._id as Types.ObjectId);
      }
    }

    // יצירת רשומת CampAttendance
    const campAttendanceData: any = {
      projectCode: parseInt(projectCode),
      classId: new Types.ObjectId(classId),
      coordinatorId: new Types.ObjectId(coordinatorId),
      leaderId: new Types.ObjectId(leaderId),
      month
    };

    // הוספת מסמכים לרשומה
    uploadedDocs.forEach(({ type, docId }) => {
      campAttendanceData[type] = docId;
    });

    if (controlDocIds.length > 0) {
      campAttendanceData.controlDocs = controlDocIds;
    }

    const campAttendance = await CampAttendance.create(campAttendanceData);
    
    res.status(201).json({
      message: 'דוח נוכחות נוצר בהצלחה',
      campAttendance,
      uploadedDocs: uploadedDocs.length + controlDocIds.length
    });
    
  } catch (err: any) {
    logErrorToFile('שגיאה ביצירת CampAttendance עם קבצים: ' + (err?.message || err));
    res.status(500).json({ error: err.message });
  }
}; 

export const deleteCampAttendanceDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId, docType, docIndex } = req.body;

    if (!recordId || !docType) {
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }

    // בדיקה שהדוח קיים
    const campAttendance = await CampAttendance.findById(recordId);
    if (!campAttendance) {
      res.status(404).json({ error: 'דוח לא נמצא' });
      return;
    }

    let documentId: string | undefined;

    // קבלת מזהה המסמך לפי הסוג
    if (docType === 'workerAttendanceDoc') {
      documentId = campAttendance.workerAttendanceDoc?.toString();
    } else if (docType === 'studentAttendanceDoc') {
      documentId = campAttendance.studentAttendanceDoc?.toString();
    } else if (docType === 'controlDocs') {
      if (campAttendance.controlDocs && campAttendance.controlDocs.length > 0) {
        if (docIndex !== undefined && docIndex >= 0 && docIndex < campAttendance.controlDocs.length) {
          documentId = campAttendance.controlDocs[docIndex].toString();
        } else {
          res.status(400).json({ error: 'אינדקס מסמך בקרה לא תקין' });
          return;
        }
      }
    }

    if (!documentId) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    // מחיקת המסמך מ-S3 ומהדאטהבייס
    const attendanceDoc = await AttendanceDocument.findById(documentId);
    if (attendanceDoc) {
      if (attendanceDoc.s3Key) {
        await deleteFileFromS3(attendanceDoc.s3Key);
      }
      await AttendanceDocument.findByIdAndDelete(documentId);
    }

    // עדכון רשומת CampAttendance
    let updateData: any = {};
    
    if (docType === 'workerAttendanceDoc') {
      updateData.workerAttendanceDoc = null;
    } else if (docType === 'studentAttendanceDoc') {
      updateData.studentAttendanceDoc = null;
    } else if (docType === 'controlDocs') {
      updateData.$pull = { controlDocs: documentId };
    }

    const updatedCampAttendance = await CampAttendance.findByIdAndUpdate(
      recordId,
      updateData,
      { new: true }
    ).populate('classId')
     .populate('coordinatorId')
     .populate('leaderId')
     .populate('workerAttendanceDoc')
     .populate('studentAttendanceDoc')
     .populate('controlDocs');

    res.status(200).json({
      message: 'מסמך נמחק בהצלחה',
      campAttendance: updatedCampAttendance
    });
    
  } catch (err: any) {
    console.error('שגיאה במחיקת מסמך מ-CampAttendance:', err);
    logErrorToFile('שגיאה במחיקת מסמך מ-CampAttendance: ' + (err?.message || err));
    res.status(500).json({ error: err.message });
  }
}; 

export const deleteCampAttendanceRecord: RequestHandler = async (req, res) => {
  try {
    const { recordId } = req.params;

    if (!recordId) {
      res.status(400).json({ error: 'חסר מזהה דוח' });
      return;
    }

    // בדיקה שהדוח קיים
    const campAttendance = await CampAttendance.findById(recordId);
    if (!campAttendance) {
      res.status(404).json({ error: 'דוח לא נמצא' });
      return;
    }

    // מחיקת כל המסמכים המשויכים
    const documentsToDelete = [];

    if (campAttendance.workerAttendanceDoc) {
      documentsToDelete.push(campAttendance.workerAttendanceDoc.toString());
    }
    if (campAttendance.studentAttendanceDoc) {
      documentsToDelete.push(campAttendance.studentAttendanceDoc.toString());
    }
    if (campAttendance.controlDocs && campAttendance.controlDocs.length > 0) {
      documentsToDelete.push(...campAttendance.controlDocs.map(doc => doc.toString()));
    }

    // מחיקת המסמכים מ-S3 ומהדאטהבייס
    for (const docId of documentsToDelete) {
      const attendanceDoc = await AttendanceDocument.findById(docId);
      if (attendanceDoc) {
        if (attendanceDoc.s3Key) {
          await deleteFileFromS3(attendanceDoc.s3Key);
        }
        await AttendanceDocument.findByIdAndDelete(docId);
      }
    }

    // מחיקת הדוח עצמו
    await CampAttendance.findByIdAndDelete(recordId);

    res.status(200).json({
      message: 'דוח נמחק בהצלחה',
      deletedRecordId: recordId
    });
    
  } catch (err: any) {
    console.error('שגיאה במחיקת דוח CampAttendance:', err);
    logErrorToFile('שגיאה במחיקת דוח CampAttendance: ' + (err?.message || err));
    res.status(500).json({ error: err.message });
  }
}; 