const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getDocuments, uploadDocument, deleteDocument, updateDocument } = require('../controllers/documentController');

router.use(authenticate);

router.get('/', getDocuments);
router.post('/', upload.single('file'), uploadDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
