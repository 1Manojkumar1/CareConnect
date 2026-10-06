const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const ATTACHMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
const DOCUMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const EVIDENCE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];

function uploadRoot() {
  return path.isAbsolute(env.uploadDir)
    ? env.uploadDir
    : path.join(__dirname, '..', '..', env.uploadDir);
}

function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot(), { recursive: true });
}

function storageFor(subdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadRoot(), subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  });
}

/**
 * Single-file upload middleware for `field` into `subdir`.
 * On success sets req.uploadedFile = { fileName, mimeType, size, storageKey, fileUrl }.
 * Multer errors are translated to 400 ApiErrors so clients get usable messages.
 */
function uploadFile(field, subdir, allowedMimes) {
  const maxBytes = env.uploadMaxMb * 1024 * 1024;
  const upload = multer({
    storage: storageFor(subdir),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) return cb(null, true);
      return cb(new Error(`INVALID_FILE_TYPE:Only ${allowedMimes.join(', ')} files are accepted.`));
    },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('FILE_TOO_LARGE', `Files must be under ${env.uploadMaxMb}MB.`));
        }
        if (String(err.message || '').startsWith('INVALID_FILE_TYPE:')) {
          return next(ApiError.badRequest('INVALID_FILE_TYPE', String(err.message).slice('INVALID_FILE_TYPE:'.length)));
        }
        return next(ApiError.badRequest('UPLOAD_FAILED', 'File upload failed.'));
      }
      if (req.file) {
        const storageKey = `${subdir}/${req.file.filename}`;
        req.uploadedFile = {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storageKey,
          fileUrl: toPublicFileUrl(storageKey),
        };
      }
      return next();
    });
  };
}

/**
 * After uploadFile: when a file was uploaded, fill req.body metadata fields
 * from it so existing express-validator chains pass unchanged (dual-mode:
 * multipart file OR JSON metadata both work).
 */
function mergeUploadedFile(req, _res, next) {
  if (req.uploadedFile) {
    req.body = req.body || {};
    if (!req.body.fileName) req.body.fileName = req.uploadedFile.fileName;
    if (!req.body.mimeType) req.body.mimeType = req.uploadedFile.mimeType;
    if (!req.body.size) req.body.size = String(req.uploadedFile.size);
    if (!req.body.storageKey) req.body.storageKey = req.uploadedFile.storageKey;
    if (!req.body.fileUrl) req.body.fileUrl = req.uploadedFile.fileUrl;
  }
  next();
}

function toPublicFileUrl(storageKey) {
  if (!storageKey) return '';
  const base = (env.publicBaseUrl || '').replace(/\/$/, '');
  if (/^https?:\/\//i.test(storageKey)) {
    if (base && !base.includes('localhost') && /^https?:\/\/localhost(:\d+)?\//i.test(storageKey)) {
      return storageKey.replace(/^https?:\/\/localhost(:\d+)?/i, base);
    }
    return storageKey;
  }
  return `${base}/uploads/${storageKey.replace(/^\/+/, '')}`;
}

/**
 * Best-effort deletion of a locally stored file. Only touches paths inside
 * the upload root (guards against seeds/legacy external storage keys).
 */
function deleteUploadedFile(storageKey) {
  try {
    if (!storageKey || /^https?:\/\//i.test(storageKey) || path.isAbsolute(storageKey)) return;
    const full = path.join(uploadRoot(), storageKey);
    if (!full.startsWith(uploadRoot())) return;
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // best-effort only
  }
}

module.exports = {
  ATTACHMENT_MIMES,
  DOCUMENT_MIMES,
  EVIDENCE_MIMES,
  uploadFile,
  mergeUploadedFile,
  toPublicFileUrl,
  deleteUploadedFile,
  ensureUploadRoot,
  uploadRoot,
};
