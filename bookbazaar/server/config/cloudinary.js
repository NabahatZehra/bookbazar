import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let storage;

if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'bookbazaar/books',
      allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
    },
  });
} else {
  // Sandbox Fallback: use memory storage if Cloudinary keys are unconfigured
  storage = multer.memoryStorage();
}

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG and WebP are allowed!'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

const messageImageFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
  }
};

export const messageImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: messageImageFilter,
});

/**
 * Upload a chat message image: Cloudinary when configured, else server/uploads/messages.
 * @param {string} [publicBase] — e.g. https://host:5000 (no trailing slash) for absolute local URLs in the client
 */
export async function uploadMessageImage(buffer, mimetype, publicBase = '') {
  const hasCloudinary =
    process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key';
  if (hasCloudinary) {
    const b64 = buffer.toString('base64');
    const dataURI = `data:${mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'bookbazaar/messages',
      resource_type: 'image',
    });
    return result.secure_url;
  }
  const dir = path.join(__dirname, '..', 'uploads', 'messages');
  fs.mkdirSync(dir, { recursive: true });
  const ext = mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  const rel = `/uploads/messages/${name}`;
  if (publicBase) {
    return `${String(publicBase).replace(/\/$/, '')}${rel}`;
  }
  return rel;
}

export default cloudinary;
