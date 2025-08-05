import express, { RequestHandler } from 'express';
import MonthlyAttendance from '../models/MonthlyAttendance';
import Document, { DocumentStatus } from '../models/Document';
import {getSignedUrl } from '../services/s3Service';
import { Types } from 'mongoose';
import { deleteAttendanceRecord } from '../controllers/attendanceController';
import multer from 'multer';
import { uploadAttendanceDocument } from '../controllers/attendanceDocumentController';
import { createCampAttendance, getCampAttendance, updateCampAttendanceDoc, createCampAttendanceWithFiles, deleteCampAttendanceDocument, deleteCampAttendanceRecord } from '../controllers/campAttendanceController';
import { getCampAttendanceByCoordinator } from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/authHandler';
import CampAttendance from '../models/CampAttendance';
import AttendanceDocument from '../models/AttendanceDocument';
import { uploadFileToS3, deleteFileFromS3 } from '../services/s3Service';

const router = express.Router();

interface AttendanceBody {
  workerId: string;
  classId: string;
  month: string;
  studentAttendanceDoc?: string;
  workerAttendanceDoc?: string;
  controlDoc?: string;
}

// Submit monthly attendance
const submitAttendance: RequestHandler = async (req, res) => {
  try {

    const { workerId, classId, month, studentAttendanceDoc, workerAttendanceDoc, controlDoc, projectCode } = req.body as AttendanceBody & { projectCode: number };

    if (!workerId || !classId || !month || !projectCode) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (projectCode !== 4) {
      res.status(400).json({ error: 'ניתן להגיש דוחות רק עבור קייטנת קיץ (קוד 4)' });
      return;
    }

    const attendance = new MonthlyAttendance({
      workerId: new Types.ObjectId(workerId),
      classId: new Types.ObjectId(classId),
      month,
      projectCode,
      studentAttendanceDoc: studentAttendanceDoc ? new Types.ObjectId(studentAttendanceDoc) : undefined,
      workerAttendanceDoc: workerAttendanceDoc ? new Types.ObjectId(workerAttendanceDoc) : undefined,
      controlDoc: controlDoc ? new Types.ObjectId(controlDoc) : undefined,
    });

    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ error: 'Failed to submit attendance' });
  }
};

// Get monthly attendance for a worker
const getWorkerAttendance: RequestHandler = async (req, res) => {
  try {
    const { workerId } = req.params;
    const query: any = { workerId: new Types.ObjectId(workerId), projectCode: 4 };
    const attendance = await MonthlyAttendance.find(query)
      .populate('classId')
      .populate('studentAttendanceDoc')
      .populate('workerAttendanceDoc')
      .populate('controlDocs');

    const attendanceWithUrls = await Promise.all(
      attendance.map(async (record) => {
        const recordObj = record.toObject();

        const addUrlToDoc = async (doc: any) => {
          if (doc && doc.s3Key && doc.status === 'ממתין') {
            return { ...doc, url: await getSignedUrl(doc.s3Key) };
          }
          return doc;
        };

        recordObj.studentAttendanceDoc = await addUrlToDoc(recordObj.studentAttendanceDoc);
        recordObj.workerAttendanceDoc = await addUrlToDoc(recordObj.workerAttendanceDoc);
        recordObj.controlDocs = await Promise.all(recordObj.controlDocs?.map(addUrlToDoc) || []);

        return recordObj;
      })
    );

    res.json(attendanceWithUrls);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

// Get monthly attendance for a class
const getClassAttendance: RequestHandler = async (req, res) => {
  try {
    const { classId } = req.params;
    const { month } = req.query;
    const query: any = { classId: new Types.ObjectId(classId), projectCode: 4 };
    if (month) {
      query.month = month;
    }
    const attendance = await MonthlyAttendance.find(query)
      .populate('workerId')
      .populate('studentAttendanceDoc')
      .populate('workerAttendanceDoc')
      .populate('controlDocs');

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

const updateAttendanceAttendanceDoc: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { docType, documentId } = req.body;
        // עדכון רק אם projectCode=4
        const attendance = await MonthlyAttendance.findOneAndUpdate(
          { _id: id, projectCode: 4 },
          { $set: { [docType]: documentId } },
          { new: true }
        );
        res.status(200).json(attendance);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
}

const getAllAttendance: RequestHandler = async (req, res) => {
    try {
        const attendance = await MonthlyAttendance.find({ projectCode: 4 })
        .populate('workerId')
        .populate('classId')
        .populate('studentAttendanceDoc')
        .populate('workerAttendanceDoc')
        .populate('controlDoc');

        const attendanceWithUrls = await Promise.all(
            attendance.map(async (record) => {
                const recordObj = record.toObject();

                const addUrlToDoc = async (doc: any) => {
                  if (doc && doc.s3Key && doc.status === 'ממתין') {
                    return { ...doc, url: await getSignedUrl(doc.s3Key) };
                  }
                  return doc;
                };
        
                recordObj.studentAttendanceDoc = await addUrlToDoc(recordObj.studentAttendanceDoc);
                recordObj.workerAttendanceDoc = await addUrlToDoc(recordObj.workerAttendanceDoc);
                recordObj.controlDocs = await Promise.all(recordObj.controlDocs?.map(addUrlToDoc) || []);
        
                return recordObj;
            })
        );

        res.status(200).json(attendanceWithUrls);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
}

// Update attendance record when document is deleted
const updateAttendanceAfterDocDelete: RequestHandler = async (req, res) => {
  try {
    const { attendanceId, docType } = req.body;
    // עדכון רק אם projectCode=4
    const updateQuery: any = { $unset: { [docType]: 1 } };
    const attendance = await MonthlyAttendance.findOneAndUpdate(
      { _id: attendanceId, projectCode: 4 },
      updateQuery,
      { new: true }
    );

    if (!attendance) {
      res.status(404).json({ error: 'לא נמצא רשום נוכחות' });
      return;
    }

    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'שגיאה בעדכון רשום נוכחות' });
  }
};

const upload = multer();

router.get('/', getAllAttendance);
router.post('/submit', submitAttendance);
router.get('/camp', getCampAttendance);

// נתיב למחיקת מסמך מ-CampAttendance - חייב להיות לפני הנתיבים עם פרמטרים
router.delete('/camp-document', deleteCampAttendanceDocument);
router.delete('/camp/:recordId', deleteCampAttendanceRecord);

// נתיב להעלאת מסמך ל-CampAttendance
router.post('/camp/upload-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { recordId, docType, docIndex } = req.body;
    const file = req.file;

    if (!recordId || !docType || !file) {
      res.status(400).json({ error: 'חסרים שדות חובה' });
      return;
    }

    // בדיקה שהדוח קיים
    const campAttendance = await CampAttendance.findById(recordId);
    if (!campAttendance) {
      res.status(404).json({ error: 'דוח לא נמצא' });
      return;
    }

    // העלאת הקובץ ל-S3
    const fileName = `${docType} - ${campAttendance.month}`;
    const s3Key = await uploadFileToS3(file.buffer, fileName, file.mimetype);

    // יצירת מסמך נוכחות
    const attendanceDoc = await AttendanceDocument.create({
      operatorId: campAttendance.leaderId,
      classId: campAttendance.classId,
      projectCode: campAttendance.projectCode,
      month: campAttendance.month,
      type: docType === 'workerAttendanceDoc' ? 'נוכחות עובדים' : 
            docType === 'studentAttendanceDoc' ? 'נוכחות תלמידים' : 'מסמך בקרה',
      fileName: fileName,
      fileType: file.mimetype,
      s3Key,
      uploadedAt: new Date(),
      status: 'ממתין',
      tz: campAttendance.leaderId.toString(),
      uploadedBy: (req as any).user?.id ? new Types.ObjectId((req as any).user.id as string) : undefined
    });

    // עדכון רשומת CampAttendance
    let updateData: any = {};
    
    if (docType === 'workerAttendanceDoc') {
      updateData.workerAttendanceDoc = attendanceDoc._id;
    } else if (docType === 'studentAttendanceDoc') {
      updateData.studentAttendanceDoc = attendanceDoc._id;
    } else if (docType === 'controlDocs') {
      updateData.$push = { controlDocs: attendanceDoc._id };
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
      message: 'מסמך הועלה בהצלחה',
      document: attendanceDoc,
      campAttendance: updatedCampAttendance
    });

  } catch (err: any) {
    console.error('שגיאה בהעלאת מסמך ל-CampAttendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// נתיב למחיקת מסמך מ-CampAttendance
router.delete('/camp/delete-document', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// קבלת דוחות נוכחות של קייטנות לפי רכז
router.get('/camp/coordinator/:coordinatorId', getCampAttendanceByCoordinator);

// קבלת דוחות נוכחות של קייטנות לפי כיתה
router.get('/camp/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    
    const campAttendance = await CampAttendance.find({ classId: new Types.ObjectId(classId) })
      .populate('classId')
      .populate('coordinatorId')
      .populate('leaderId')
      .populate('workerAttendanceDoc')
      .populate('studentAttendanceDoc')
      .populate('controlDocs');

    // הוספת URLs חתומים למסמכים
    const attendanceWithUrls = await Promise.all(
      campAttendance.map(async (record) => {
        const recordObj = record.toObject();

        const addUrlToDoc = async (doc: any) => {
          if (doc && doc.s3Key && doc.status === 'ממתין') {
            return { ...doc, url: await getSignedUrl(doc.s3Key) };
          }
          return doc;
        };

        recordObj.workerAttendanceDoc = await addUrlToDoc(recordObj.workerAttendanceDoc);
        recordObj.studentAttendanceDoc = await addUrlToDoc(recordObj.studentAttendanceDoc);
        recordObj.controlDocs = await Promise.all(recordObj.controlDocs?.map(addUrlToDoc) || []);

        return recordObj;
      })
    );

    res.json(attendanceWithUrls);
  } catch (error) {
    console.error('שגיאה בקבלת דוחות נוכחות לפי כיתה:', error);
    res.status(500).json({ error: 'שגיאה בקבלת דוחות נוכחות' });
  }
});

router.get('/:workerId', getWorkerAttendance);
router.get('/:classId', getClassAttendance);
router.delete('/:id', deleteAttendanceRecord);

router.patch('/attendance-document/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const doc = await AttendanceDocument.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!doc) {
      res.status(404).json({ error: 'לא נמצא מסמך' });
      return;
    }
    res.json(doc);
    return;
  } catch (e: any) {
    console.error("Error updating document:", e);
    res.status(500).json({ error: e.message });
    return;
  }
});
router.patch('/update-attendance/:id', updateAttendanceAttendanceDoc);
router.patch('/update-after-doc-delete', updateAttendanceAfterDocDelete);
router.post('/upload-attendance-doc', upload.single('file'), uploadAttendanceDocument);
router.post('/camp', createCampAttendance);
router.patch('/camp/:id', updateCampAttendanceDoc);
router.post('/camp-with-files', authenticateToken, upload.fields([
  { name: 'workerFile', maxCount: 1 },
  { name: 'studentFile', maxCount: 1 },
  { name: 'controlFiles', maxCount: 5 }
]), createCampAttendanceWithFiles);

// עדכון סטטוס של מסמך נוכחות


// יצירת URL למסמך ספציפי
router.get('/document/:id/url', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await AttendanceDocument.findById(id);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    if (!doc.s3Key) {
      res.status(400).json({ error: 'אין מפתח S3 למסמך' });
      return;
    }

    const url = await getSignedUrl(doc.s3Key);
    res.json({ url });
    
  } catch (error) {
    console.error('שגיאה ביצירת URL למסמך:', error);
    res.status(500).json({ error: 'שגיאה ביצירת URL' });
  }
});

export default router; 