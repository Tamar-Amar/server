import express from 'express';
import { logAuth, workerLogin, verifyWorkerCode } from '../controllers/authController';

const router = express.Router();

// התחברות מפעיל/מנהל
router.post('/', logAuth);

// התחברות עובד - שלב ראשון
router.post('/worker-after-noon/login', workerLogin);

// אימות קוד עובד - שלב שני
router.post('/worker-after-noon/verify', verifyWorkerCode);

export default router;
