import express from 'express';
import { 
  createUser, 
  getAllUsers, 
  getUserById, 
  updateUser, 
  changePassword, 
  deleteUser,
  importCoordinators
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../controllers/uploadController';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createUser);

router.get('/', getAllUsers);

router.get('/:id', getUserById);

router.put('/:id', updateUser);

router.put('/:id/password', changePassword);

router.delete('/:id', deleteUser);

router.post('/import-coordinators', upload, importCoordinators);

export default router; 