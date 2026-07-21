import { Router } from 'express';
import { listBatches, getBatchById, createBatch, updateBatch, deleteBatch } from '../controllers/batches.controller';

const router = Router();

router.get('/', listBatches);
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.patch('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;
