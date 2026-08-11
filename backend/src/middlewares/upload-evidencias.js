const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '../../../uploads/evidencias');

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'foto')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-');
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${stamp}-${safe}`.slice(0, 180));
  },
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new Error('Solo se permiten imágenes'));
    return;
  }
  cb(null, true);
}

const uploadEvidencias = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 6 * 1024 * 1024,
  },
}).array('fotos', 5);

module.exports = {
  UPLOAD_ROOT,
  uploadEvidencias,
};
