import { Router } from 'express';
import { listBatches, getBatchById, createBatch, updateBatch, deleteBatch, getMarketplaceBatches } from '../controllers/batches.controller';

const router = Router();

router.get('/', listBatches);
router.get('/marketplace', getMarketplaceBatches);
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.patch('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;
