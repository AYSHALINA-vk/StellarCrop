import { Router } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users.controller';

const router = Router();

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
