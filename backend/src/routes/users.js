const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, searchUsers } = require('../controllers/userController');

router.use(authenticate);

router.get('/search', searchUsers);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
