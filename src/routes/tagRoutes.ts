import express from 'express';
import { addWorkerTag, getWorkerTags, updateTag, deleteWorkerTag, getWorkerTagsByWorkerId } from '../controllers/workerTagController';

const router = express.Router();

router.post('/', addWorkerTag);
router.get('/', getWorkerTags);
router.get('/:id', getWorkerTagsByWorkerId);
router.put('/:id', updateTag);

router.delete('/:id', deleteWorkerTag);

export default router; 