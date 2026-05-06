import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const verifyCloudinaryConfig = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
    );
  }
  return cloudinary.config();
};

// Upload a file buffer to Cloudinary
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return reject(new Error('Cloudinary credentials not configured'));
    }

    const uploadOptions = {
      resource_type: 'auto',
      folder: options.folder || 'whatsapp-clone',
      public_id: options.public_id,
      transformation: options.isAvatar
        ? [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ]
        : undefined,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(new Error(`Upload failed: ${error.message}`));
      resolve(result);
    });

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Derive the Cloudinary public_id from a secure URL robustly
const extractPublicId = (imageUrl) => {
  try {
    // URL pattern: https://res.cloudinary.com/<cloud>/image/upload/[v<num>/]<public_id>.<ext>
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Skip optional version segment (e.g. "v1234567890")
    let start = uploadIndex + 1;
    if (/^v\d+$/.test(pathParts[start])) start++;

    // Join remaining path and strip extension
    const publicIdWithExt = pathParts.slice(start).join('/');
    return publicIdWithExt.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
};

// Delete a file from Cloudinary by its URL
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return { success: false, message: 'Not a Cloudinary URL' };
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      console.warn('Could not extract public_id from URL:', imageUrl);
      return { success: false, message: 'Could not extract public_id' };
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok'
      ? { success: true, result }
      : { success: false, result };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return { success: false, error: error.message };
  }
};
