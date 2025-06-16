import express from 'express';
import { RequestHandler } from 'express';
import MonthlyAttendance from '../models/MonthlyAttendance';
import { Types } from 'mongoose';
import { deleteAttendanceRecord } from '../controllers/attendanceController';

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
    const { workerId, classId, month, studentAttendanceDoc, workerAttendanceDoc, controlDoc } = req.body as AttendanceBody;

    if (!workerId || !classId || !month) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const attendance = new MonthlyAttendance({
      workerId: new Types.ObjectId(workerId),
      classId: new Types.ObjectId(classId),
      month,
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

    const query: any = { workerId: new Types.ObjectId(workerId) };
    const attendance = await MonthlyAttendance.find(query)
      .populate('classId')
      .populate('studentAttendanceDoc')
      .populate('workerAttendanceDoc')
      .populate('controlDoc');

    console.log("attendance from server", attendance);
    res.json(attendance);
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

    const query: any = { classId: new Types.ObjectId(classId) };
    if (month) {
      query.month = month;
    }

    const attendance = await MonthlyAttendance.find(query)
      .populate('workerId')
      .populate('studentAttendanceDoc')
      .populate('workerAttendanceDoc')
      .populate('controlDoc');

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

        const attendance = await MonthlyAttendance.findByIdAndUpdate(id, { $set: { [docType]: documentId } }, { new: true });
        res.status(200).json(attendance);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
}

const getAllAttendance: RequestHandler = async (req, res) => {
    try {
        const attendance = await MonthlyAttendance.find()
        .populate('workerId')
        .populate('classId')
        .populate('studentAttendanceDoc')
        .populate('workerAttendanceDoc')
        .populate('controlDoc');

        res.status(200).json(attendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
}

// Update attendance record when document is deleted
const updateAttendanceAfterDocDelete: RequestHandler = async (req, res) => {
  try {
    const { attendanceId, docType } = req.body;
    
    const updateQuery: any = { $unset: { [docType]: 1 } };
    const attendance = await MonthlyAttendance.findByIdAndUpdate(
      attendanceId,
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

router.get('/', getAllAttendance);
router.post('/submit', submitAttendance);
router.get('/:workerId', getWorkerAttendance);
router.get('/:classId', getClassAttendance);
router.delete('/:id', deleteAttendanceRecord);
router.patch('/update-attendance/:id', updateAttendanceAttendanceDoc);
router.patch('/update-after-doc-delete', updateAttendanceAfterDocDelete);
export default router; 