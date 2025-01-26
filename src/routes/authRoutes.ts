import express from 'express';
import { logAouth } from '../controllers/authController';

const router = express.Router();

// Route: POST /api/auth
router.post('/', logAouth);

export default router;
