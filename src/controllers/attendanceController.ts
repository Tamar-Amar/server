import { RequestHandler } from 'express';
import MonthlyAttendance from '../models/MonthlyAttendance';
import Document from '../models/Document';

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
      await Document.findByIdAndDelete(attendanceRecord.studentAttendanceDoc);
    }
    if (attendanceRecord.workerAttendanceDoc) {
      await Document.findByIdAndDelete(attendanceRecord.workerAttendanceDoc);
    }
    if (attendanceRecord.controlDoc) {
      await Document.findByIdAndDelete(attendanceRecord.controlDoc);
    }

    // Delete the attendance record
    await MonthlyAttendance.findByIdAndDelete(id);

    res.json({ message: 'רשום נוכחות נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ message: 'שגיאה במחיקת רשום נוכחות' });
  }
}; 