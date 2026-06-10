const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, submitTemplate, getSubmissions, deleteSubmission } = require('../controllers/templateController');

router.use(authenticate);

router.get('/', getTemplates);
router.get('/submissions', getSubmissions);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/submit', submitTemplate);
router.delete('/submissions/:id', deleteSubmission);

module.exports = router;
