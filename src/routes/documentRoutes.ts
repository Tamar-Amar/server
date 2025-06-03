import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getWorkerDocuments,
  updateDocumentStatus,
  deleteDocument,
  getAllDocuments
} from '../controllers/documentController';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

router.post('/upload', upload.single('file'), uploadDocument);

router.get('/:workerId', getWorkerDocuments);

router.patch('/status/:documentId', updateDocumentStatus);

router.delete('/:documentId', deleteDocument);

router.get('/', getAllDocuments);

export default router;
