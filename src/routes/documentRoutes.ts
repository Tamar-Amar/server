import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getWorkerDocuments,
  updateDocumentStatus,
  deleteDocument
} from '../controllers/documentController';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// העלאת מסמך חדש
router.post('/upload', upload.single('file'), uploadDocument);

// קבלת כל המסמכים של עובד
router.get('/:workerId', getWorkerDocuments);

// עדכון סטטוס מסמך
router.patch('/:documentId/status', updateDocumentStatus);

// מחיקת מסמך
router.delete('/:documentId', deleteDocument);

export default router;
