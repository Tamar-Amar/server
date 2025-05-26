import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    
    return {
      folder: 'operator-documents',
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'auto',
      public_id: uniqueFilename.replace(/\.[^/.]+$/, ''),
      format: file.originalname.split('.').pop()?.toLowerCase(),
    };
  },
});

