import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createAssignment,
  getWorkerAssignments,
  getClassAssignments,
  getProjectAssignments,
  getAllAssignments,
  getActiveAssignmentsOnDate,
  updateAssignment,
  endAssignment,
  deleteAssignment,
  getWorkerHistory,
  getClassHistory,
  createMultipleAssignments,
  checkAssignmentExists
} from '../controllers/workerAssignmentController';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createAssignment);

router.post('/multiple', createMultipleAssignments);

router.post('/bulk', createMultipleAssignments);

router.get('/', getAllAssignments);

router.get('/worker/:workerId', getWorkerAssignments);

router.get('/class/:classId', getClassAssignments);

router.get('/project/:projectCode', getProjectAssignments);

router.get('/active-on-date', getActiveAssignmentsOnDate);

router.put('/:assignmentId', updateAssignment);

router.patch('/:assignmentId/end', endAssignment);

router.delete('/:assignmentId', deleteAssignment);

router.get('/worker/:workerId/history', getWorkerHistory);

router.get('/class/:classId/history', getClassHistory);

router.get('/exists', checkAssignmentExists);

export default router;

