import express from 'express';
import { logAuth } from '../controllers/authController';

const router = express.Router();

// Route: POST /api/auth
router.post('/', logAuth);

export default router;
