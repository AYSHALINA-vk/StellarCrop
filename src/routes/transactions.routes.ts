import { Router } from 'express';
import {
  listTransactions, getTransactionById,
  createTransaction, updateTransaction,
} from '../controllers/transactions.controller';

const router = Router();

router.get('/', listTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
// No DELETE — custody transfers are immutable records

export default router;