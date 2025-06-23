import { v2 as cloudinary } from 'cloudinary';

// Remove the console.log from here since env vars might not be loaded yet
// when this module is imported

// Add a function to verify configuration when needed
export const verifyCloudinaryConfig = () => {
  console.log('Cloudinary ENV:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : undefined,
  });
};

export default cloudinary;