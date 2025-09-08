// routes/samples.js
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
  downloadSampleFile,
  downloadMultipleSampleFiles,
  getSampleStats,
  deleteSample,
  getSampleStatusByContact
} = require('../controllers/sampleController');

// Import auth middleware the same way as your lead routes
const authMiddleware = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/samples/',
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Helper function for role-based access
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

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/samples - Get all samples with filtering
router.get('/', getAllSamples);

// GET /api/samples/statistics - Get sample statistics
router.get('/statistics', getSampleStats);

// GET /api/samples/contact/:contactId/status - Get sample status for a contact
router.get('/contact/:contactId/status', getSampleStatusByContact);

// GET /api/samples/:id - Get sample by ID
router.get('/:id', getSampleById);

// POST /api/samples - Create new sample request
router.post('/', createSampleRequest);

// PATCH /api/samples/:id/status - Update sample status
router.patch('/:id/status', updateSampleStatus);

router.post('/:id/upload', 
  requireRole(['uploader', 'superadmin']),
  uploadSampleFile  // This now includes multer middleware
);

router.post('/:id/upload-multiple', 
  requireRole(['uploader', 'superadmin']),
  uploadSampleFiles  // This now includes multer middleware
);

// GET /api/samples/:id/download/:fileId - Download single sample file
router.get('/:id/download/:fileId', downloadSampleFile);

// POST /api/samples/:id/download-multiple - Download multiple sample files
router.post('/:id/download-multiple', downloadMultipleSampleFiles);

// DELETE /api/samples/:id - Delete sample (superadmin only)
router.delete('/:id', 
  requireRole(['superadmin']),
  deleteSample
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 200MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed. Please upload PDF, DOC, XLS, PPT, TXT, or image files.'
    });
  }
  
  next(error);
});

module.exports = router;