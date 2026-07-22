import { Router } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser, verifyUser } from '../controllers/users.controller';





const router = Router();

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.patch('/:id/verify', verifyUser);


router.delete('/:id', deleteUser);

export default router;
