
import express from 'express';
import multer from 'multer';
import { uploadDocument, getDocumentsByOperator } from '../controllers/documentController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:operatorId', getDocumentsByOperator);

export default router;
