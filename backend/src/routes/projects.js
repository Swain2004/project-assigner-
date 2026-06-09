const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAllProjects, getProjectById, createProject, updateProject, deleteProject, addMember, removeMember } = require('../controllers/projectController');

router.use(authenticate);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
