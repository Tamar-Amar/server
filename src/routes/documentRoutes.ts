import express from 'express';
import multer from 'multer';
import { storage } from '../utils/cloudinary';
import { uploadDocument, getDocumentsByOperator, updateOperatorDocuments } from '../controllers/documentController';

const router = express.Router();

const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:operatorId', getDocumentsByOperator);
router.put('/update-operator', updateOperatorDocuments);

export default router;
