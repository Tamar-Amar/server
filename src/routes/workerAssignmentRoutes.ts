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

router.use(authenticateToken);

router.post('/', createAssignment);

router.post('/multiple', createMultipleAssignments);

router.get('/worker/:workerId', getWorkerAssignments);

router.get('/class/:classId', getClassAssignments);

router.get('/project/:projectCode', getProjectAssignments);

router.get('/active-on-date', getActiveAssignmentsOnDate);

router.put('/:assignmentId', updateAssignment);

router.patch('/:assignmentId/end', endAssignment);

router.delete('/:assignmentId', deleteAssignment);

router.get('/worker/:workerId/history', getWorkerHistory);

router.get('/class/:classId/history', getClassHistory);

export default router;
