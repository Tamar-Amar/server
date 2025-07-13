import express from 'express';
import { 
  logAuth, 
  workerLogin, 
  verifyWorkerCode, 
  coordinatorLogin,
  coordinatorVerify,
  forgotPassword,
  resetPassword
} from '../controllers/authController';

const router = express.Router();

router.post('/', logAuth);
router.post('/worker-after-noon/login', workerLogin);
router.post('/worker-after-noon/verify', verifyWorkerCode);
router.post('/coordinator/verify', coordinatorVerify);
router.post('/coordinator/login', coordinatorLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
