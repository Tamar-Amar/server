import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getWorkerDocuments,
  updateDocumentStatus,
  deleteDocument,
  getAllDocuments,
  getAllPersonalDocuments,
  getCoordinatorWorkerDocuments,
  cleanupUndefinedTags,
  getDocumentStats,
  downloadMultipleDocuments,
  bulkUpdateDocumentStatus,
  bulkDeleteDocuments,
  getDocumentTypes,
  getAttendanceDocuments,
} from '../controllers/documentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

router.post('/upload', upload.single('file'), uploadDocument);

router.get('/', getAllDocuments);

router.get('/personal', getAllPersonalDocuments);
router.get('/all-personal', authenticateToken, getAllPersonalDocuments);
router.get('/attendance/:projectCode', authenticateToken, getAttendanceDocuments);

router.get('/coordinator/:coordinatorId', authenticateToken, getCoordinatorWorkerDocuments);

router.get('/:workerId', getWorkerDocuments);
router.get('/worker/:workerId', getWorkerDocuments);

router.patch('/status/:documentId', updateDocumentStatus);

router.delete('/:documentId', deleteDocument);

router.delete('/cleanup/undefined-tags', authenticateToken, cleanupUndefinedTags);

router.get('/stats', authenticateToken, getDocumentStats);
router.get('/types', getDocumentTypes);

router.post('/download-multiple', authenticateToken, downloadMultipleDocuments);
router.patch('/bulk-update-status', authenticateToken, bulkUpdateDocumentStatus);
router.delete('/bulk-delete', authenticateToken, bulkDeleteDocuments);

export default router;
