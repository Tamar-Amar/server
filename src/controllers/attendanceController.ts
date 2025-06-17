import { RequestHandler } from 'express';
import MonthlyAttendance from '../models/MonthlyAttendance';
import Document from '../models/Document';
import { deleteFileFromS3 } from '../services/s3Service';

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
    if (attendanceRecord.controlDoc) {
      await deleteDocumentByIdFromAms(attendanceRecord.controlDoc.toString());
    }

    // Delete the attendance record
    await MonthlyAttendance.findByIdAndDelete(id);

    res.json({ message: 'רשום נוכחות נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ message: 'שגיאה במחיקת רשום נוכחות' });
  }
}; 