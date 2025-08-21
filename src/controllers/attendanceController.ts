import { RequestHandler, Request, Response } from 'express';
import MonthlyAttendance from '../models/MonthlyAttendance';
import Document from '../models/Document';
import { deleteFileFromS3, getSignedUrl } from '../services/s3Service';

// documentController.ts
export const deleteDocumentByIdFromAms = async (documentId: string) => {
  const doc = await Document.findById(documentId);
  if (!doc) return;
  await deleteFileFromS3(doc.s3Key as string);
  await Document.findByIdAndDelete(doc._id);
};

export const deleteAttendanceRecord: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the attendance record
    const attendanceRecord = await MonthlyAttendance.findById(id);
    if (!attendanceRecord) {
      res.status(404).json({ message: 'לא נמצא רשום נוכחות' });
      return;
    }

    // Delete associated documents if they exist
    if (attendanceRecord.studentAttendanceDoc) {
      await deleteDocumentByIdFromAms(attendanceRecord.studentAttendanceDoc.toString());
    }
    if (attendanceRecord.workerAttendanceDoc) {
      await deleteDocumentByIdFromAms(attendanceRecord.workerAttendanceDoc.toString());
    }
    if (attendanceRecord.controlDocs && Array.isArray(attendanceRecord.controlDocs)) {
      for (const docId of attendanceRecord.controlDocs) {
        await deleteDocumentByIdFromAms(docId.toString());
      }
    }

    // Delete the attendance record
    await MonthlyAttendance.findByIdAndDelete(id);

    res.json({ message: 'רשום נוכחות נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ message: 'שגיאה במחיקת רשום נוכחות' });
  }
};

export const getCampAttendanceByCoordinator = async (req: Request, res: Response): Promise<void> => {
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

    const Class = require('../models/Class').default;
    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes }
    });


    const classIds = classes.map((cls: any) => cls._id);

    const CampAttendance = require('../models/CampAttendance').default;
    const attendanceRecords = await CampAttendance.find({
      classId: { $in: classIds }
    })
    .populate('classId', 'uniqueSymbol name institutionCode')
    .populate('leaderId', 'firstName lastName')
    .populate('coordinatorId', 'firstName lastName')
    .populate({
      path: 'workerAttendanceDoc',
      model: 'AttendanceDocument',
      select: 'fileName fileType s3Key uploadedAt status comments type'
    })
    .populate({
      path: 'studentAttendanceDoc',
      model: 'AttendanceDocument',
      select: 'fileName fileType s3Key uploadedAt status comments type'
    })
    .populate({
      path: 'controlDocs',
      model: 'AttendanceDocument',
      select: 'fileName fileType s3Key uploadedAt status comments type'
    })
    .lean();


    for (const record of attendanceRecords) {
      if (record.workerAttendanceDoc && record.workerAttendanceDoc.s3Key) {
        record.workerAttendanceDoc.url = await getSignedUrl(record.workerAttendanceDoc.s3Key);
      }
      if (record.studentAttendanceDoc && record.studentAttendanceDoc.s3Key) {
        record.studentAttendanceDoc.url = await getSignedUrl(record.studentAttendanceDoc.s3Key);
      }
      if (record.controlDocs && record.controlDocs.length > 0) {
        for (const doc of record.controlDocs) {
          if (doc.s3Key) {
            doc.url = await getSignedUrl(doc.s3Key);
          }
        }
      }
    }

    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error('שגיאה ב-getCampAttendanceByCoordinator:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
}; 