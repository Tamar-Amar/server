import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getWorkerDocuments,
  updateDocumentStatus,
  deleteDocument,
  getAllDocuments,
  getAllPersonalDocuments,
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

router.get('/', getAllDocuments);

router.get('/personal', getAllPersonalDocuments);

router.get('/:workerId', getWorkerDocuments);

router.patch('/status/:documentId', updateDocumentStatus);

router.delete('/:documentId', deleteDocument);

export default router;
