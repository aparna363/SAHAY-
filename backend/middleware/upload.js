const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/incidents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `inc-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}${ext}`;
    cb(null, safeName);
  }
});

// File Filter for Image Formats Only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed. Executables and scripts are strictly rejected.'), false);
  }
};

// Multer Upload Instance
const uploadIncidentMedia = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 3 // Up to 3 images per submission
  }
});

// Ensure rescue evidence upload directory exists
const evidenceUploadDir = path.join(__dirname, '../uploads/rescue_evidence');
if (!fs.existsSync(evidenceUploadDir)) {
  fs.mkdirSync(evidenceUploadDir, { recursive: true });
}

// Evidence Storage Configuration
const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, evidenceUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `ev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}${ext}`;
    cb(null, safeName);
  }
});

// File Filter for Evidence (Images + Safe Video formats)
const evidenceFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov', '.m4v'];

  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed formats: JPG, PNG, WEBP for photos, and MP4, WEBM, MOV for videos. Executable files are strictly rejected.'), false);
  }
};

const uploadRescueEvidence = multer({
  storage: evidenceStorage,
  fileFilter: evidenceFileFilter,
  limits: {
    fileSize: 35 * 1024 * 1024, // 35 MB max per file
    files: 5 // Up to 5 files per evidence upload
  }
});

// Ensure relief evidence directory exists
const reliefUploadDir = path.join(__dirname, '../uploads/relief_evidence');
if (!fs.existsSync(reliefUploadDir)) {
  fs.mkdirSync(reliefUploadDir, { recursive: true });
}

// Relief Storage Configuration
const reliefStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reliefUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `relief-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}${ext}`;
    cb(null, safeName);
  }
});

const reliefFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedMimeTypes.includes(file.mimetype);
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF documents are allowed for relief evidence.'), false);
  }
};

const uploadReliefMedia = multer({
  storage: reliefStorage,
  fileFilter: reliefFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 5 // Up to 5 files per upload
  }
});

const uploadSOSMedia = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

module.exports = { uploadIncidentMedia, uploadRescueEvidence, uploadReliefMedia, uploadSOSMedia };
