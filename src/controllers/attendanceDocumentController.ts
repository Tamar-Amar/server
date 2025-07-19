import { RequestHandler } from 'express';
import AttendanceDocument from '../models/AttendanceDocument';
import { uploadFileToS3 } from '../services/s3Service';
import fs from 'fs';

function logErrorToFile(message: string) {
  const logMsg = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync('logs/attendanceDocument.log', logMsg);
}

export const uploadAttendanceDocument: RequestHandler = async (req, res) => {
  try {

    const { operatorId, classId, projectCode, month, type, tz } = req.body;
    if (!req.file || !operatorId || !classId || !projectCode || !month || !type || !tz) {
      res.status(400).json({ error: 'חסרים שדות חובה או קובץ' });
      return;
    }
    // העלאת קובץ ל-S3
    const { buffer, originalname, mimetype } = req.file;
    const s3Key = await uploadFileToS3(buffer, originalname, mimetype);
    // יצירת AttendanceDocument
    const doc = await AttendanceDocument.create({
      operatorId,
      classId,
      projectCode,
      month,
      type,
      fileName: originalname,
      fileType: mimetype,
      s3Key,
      uploadedAt: new Date(),
      status: 'ממתין',
      tz,
      uploadedBy: req.user?.id || null
    });
    res.status(201).json(doc);
    return;
  } catch (err: any) {
    logErrorToFile('שגיאה ביצירת מסמך נוכחות: ' + (err?.message || err));
    res.status(500).json({ error: err.message });
    return;
  }
}; 