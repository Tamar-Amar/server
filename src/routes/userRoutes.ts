import express from 'express';
import { 
  createUser, 
  getAllUsers, 
  getUserById, 
  updateUser, 
  changePassword, 
  deleteUser 
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createUser);

router.get('/', getAllUsers);

router.get('/:id', getUserById);

router.put('/:id', updateUser);

router.put('/:id/password', changePassword);

router.delete('/:id', deleteUser);

export default router; 