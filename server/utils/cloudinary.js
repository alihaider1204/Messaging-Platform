// Explicitly load environment variables at the top
import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Get environment variables
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

console.log('🌍 Environment variables in cloudinary utils:', {
  CLOUDINARY_CLOUD_NAME: CLOUDINARY_CLOUD_NAME || 'UNDEFINED',
  CLOUDINARY_API_KEY: CLOUDINARY_API_KEY ? `${CLOUDINARY_API_KEY.substring(0, 6)}...` : 'UNDEFINED',
  CLOUDINARY_API_SECRET: CLOUDINARY_API_SECRET ? '***SET***' : 'UNDEFINED'
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

console.log('🔧 Cloudinary configured in utils file');

export const verifyCloudinaryConfig = () => {
  console.log('🔍 Checking Cloudinary config:', {
    cloud_name: CLOUDINARY_CLOUD_NAME ? `${CLOUDINARY_CLOUD_NAME} (✓)` : 'missing (❌)',
    api_key: CLOUDINARY_API_KEY ? `${CLOUDINARY_API_KEY.substring(0, 6)}... (✓)` : 'missing (❌)',
    api_secret: CLOUDINARY_API_SECRET ? '****** (✓)' : 'missing (❌)'
  });
  
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary configuration is incomplete!');
    throw new Error('Cloudinary configuration is incomplete. Please check your .env file.');
  }
  
  console.log('✅ Cloudinary configuration verified successfully');
  return cloudinary.config();
};

// Upload file buffer to Cloudinary
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting Cloudinary upload...');
    
    // Verify we have the required credentials
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      const error = new Error('Cloudinary credentials not available');
      console.error('❌ Missing Cloudinary credentials:', {
        cloud_name: !!CLOUDINARY_CLOUD_NAME,
        api_key: !!CLOUDINARY_API_KEY,
        api_secret: !!CLOUDINARY_API_SECRET
      });
      return reject(error);
    }

    const uploadOptions = {
      resource_type: 'auto',
      folder: options.folder || 'whatsapp-clone',
      transformation: options.transformation || (options.isAvatar ? [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ] : undefined),
      public_id: options.public_id,
      ...options
    };

    console.log('📤 Upload options:', { 
      ...uploadOptions, 
      transformation: uploadOptions.transformation ? 'defined' : 'none' 
    });

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return reject(new Error(`Upload failed: ${error.message}`));
        }
        
        console.log('✅ Cloudinary upload successful!');
        console.log('📋 Result:', {
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type
        });
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      console.log('⚠️ Skipping delete - not a Cloudinary URL:', imageUrl);
      return { success: false, message: 'Invalid Cloudinary URL' };
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicId = fileWithExtension.split('.')[0];
    
    // Include folder if it exists
    const folderIndex = urlParts.findIndex(part => part === 'whatsapp-clone');
    const fullPublicId = folderIndex !== -1 
      ? `whatsapp-clone/avatars/${publicId}` 
      : publicId;

    console.log('🗑️ Attempting to delete:', fullPublicId);
    const result = await cloudinary.uploader.destroy(fullPublicId);
    
    if (result.result === 'ok') {
      console.log('✅ Old image deleted from Cloudinary:', fullPublicId);
      return { success: true, result };
    } else {
      console.warn('⚠️ Failed to delete image from Cloudinary:', result);
      return { success: false, result };
    }
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    return { success: false, error: error.message };
  }
};