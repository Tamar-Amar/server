import express from 'express';
import { addWorkerTag, getWorkerTags, updateTag, deleteWorkerTag, getWorkerTagsByWorkerId, bulkUpdateWorkerTags } from '../controllers/workerTagController';

const router = express.Router();

router.post('/', addWorkerTag);
router.get('/', getWorkerTags);
router.post('/bulk-update', bulkUpdateWorkerTags);
router.get('/:id', getWorkerTagsByWorkerId);
router.put('/:id', updateTag);
router.delete('/:id', deleteWorkerTag);

export default router; 