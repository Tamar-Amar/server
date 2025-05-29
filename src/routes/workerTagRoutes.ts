import express from 'express';
import { addWorkerTag, getWorkerTags, updateWorkerTag, deleteWorkerTag, getWorkerTagsByWorkerId } from '../controllers/workerTagController';

const router = express.Router();

router.post('/', addWorkerTag);
router.get('/', getWorkerTags);
router.get('/:id', getWorkerTagsByWorkerId);
router.put('/:id', updateWorkerTag);
router.delete('/:id', deleteWorkerTag);

export default router; 