const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getTemplates, createTemplate, deleteTemplate, submitTemplate, getSubmissions, deleteSubmission } = require('../controllers/templateController');

router.use(authenticate);

router.get('/', getTemplates);
router.get('/submissions', getSubmissions);
router.post('/', upload.single('file'), createTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/submit', upload.single('file'), submitTemplate);
router.delete('/submissions/:id', deleteSubmission);

module.exports = router;
