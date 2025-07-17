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

router.get('/coordinator/:coordinatorId', authenticateToken, getCoordinatorWorkerDocuments);

router.get('/:workerId', getWorkerDocuments);
router.get('/worker/:workerId', getWorkerDocuments);

router.patch('/status/:documentId', updateDocumentStatus);

router.delete('/:documentId', deleteDocument);

// נתיב לניקוי מסמכים עם תג undefined (רק למנהלים)
router.delete('/cleanup/undefined-tags', authenticateToken, cleanupUndefinedTags);

export default router;
