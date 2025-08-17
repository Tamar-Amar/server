import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createAssignment,
  getWorkerAssignments,
  getClassAssignments,
  getProjectAssignments,
  getActiveAssignmentsOnDate,
  updateAssignment,
  endAssignment,
  deleteAssignment,
  getWorkerHistory,
  getClassHistory,
  createMultipleAssignments
} from '../controllers/workerAssignmentController';

const router = express.Router();

// הגנה על כל הנתיבים
router.use(authenticateToken);

// יצירת חיבור חדש
router.post('/', createAssignment);

// יצירת חיבורים מרובים
router.post('/multiple', createMultipleAssignments);

// קבלת חיבורים של עובד
router.get('/worker/:workerId', getWorkerAssignments);

// קבלת חיבורים של כיתה
router.get('/class/:classId', getClassAssignments);

// קבלת חיבורים לפי פרויקט
router.get('/project/:projectCode', getProjectAssignments);

// קבלת חיבורים פעילים בתאריך מסוים
router.get('/active-on-date', getActiveAssignmentsOnDate);

// עדכון חיבור
router.put('/:assignmentId', updateAssignment);

// סיום חיבור
router.patch('/:assignmentId/end', endAssignment);

// מחיקת חיבור
router.delete('/:assignmentId', deleteAssignment);

// קבלת היסטוריית עובד
router.get('/worker/:workerId/history', getWorkerHistory);

// קבלת היסטוריית כיתה
router.get('/class/:classId/history', getClassHistory);

export default router;
