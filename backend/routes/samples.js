const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createSampleRequest,
  getAllSamples,
  getSampleById,
  updateSampleStatus,
  uploadSampleFile,
  uploadSampleFiles,
  uploadRequirementFiles,
  downloadSampleFile,
  downloadMultipleSampleFiles,
  downloadRequirementFile,
  getSampleStats,
  deleteSample,
  getSampleStatusByContact
} = require('../controllers/sampleController');

const authMiddleware = require('../middleware/auth');

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`
      });
    }
    
    next();
  };
};

router.use(authMiddleware);

router.get('/', getAllSamples);

router.get('/statistics', getSampleStats);

router.get('/contact/:contactId/status', getSampleStatusByContact);

router.get('/:id', getSampleById);

router.post('/', createSampleRequest);

router.patch('/:id/status', updateSampleStatus);

router.post('/:id/upload', 
  requireRole(['uploader', 'superadmin']),
  uploadSampleFile
);

router.post('/:id/upload-multiple', 
  requireRole(['uploader', 'superadmin']),
  uploadSampleFiles
);

router.post('/:id/upload-requirements', 
  requireRole(['sales', 'uploader', 'superadmin']),
  uploadRequirementFiles
);

router.get('/:id/download/:fileId', downloadSampleFile);

router.post('/:id/download-multiple', downloadMultipleSampleFiles);

router.get('/:id/download-requirement/:fileId', downloadRequirementFile);

router.delete('/:id', 
  requireRole(['superadmin']),
  deleteSample
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 200MB per file for samples, 50MB for requirements.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files for samples, 5 for requirements.'
      });
    }
  }
  
  if (error.message === 'File type not allowed' || error.message === 'File type not allowed for requirements') {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed. Please upload PDF, DOC, XLS, PPT, TXT, or image files.'
    });
  }
  
  next(error);
});

module.exports = router;