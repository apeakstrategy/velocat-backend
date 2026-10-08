const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { randomUUID } = require('crypto');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const hasRealCredential = (value) => Boolean(value && !/^(replace|change)[-_ ]/i.test(value));
const cloudinaryConfigured = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET
].every(hasRealCredential);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!acceptedImageTypes.has(file.mimetype)) {
      return callback(new Error('Only JPEG, PNG, WebP, AVIF, and GIF images are accepted.'));
    }
    callback(null, true);
  }
});

router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({ error: 'Image uploads are not configured.' });
  }
  upload.single('file')(req, res, (error) => {
    if (error) return next(error);
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided for upload.' });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'velocad_engineering',
          public_id: randomUUID(),
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']
        },
        (error, uploaded) => error ? reject(error) : resolve(uploaded)
      );
      stream.end(req.file.buffer);
    });

    res.status(201).json({
      message: 'Image uploaded successfully to Cloudinary',
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(502).json({ error: 'Failed to upload image to Cloudinary.' });
  }
});

module.exports = router;
