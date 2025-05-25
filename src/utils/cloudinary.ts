import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'operator-documents',
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image', 
    format: file.mimetype.split('/')[1],
    public_id: `${Date.now()}-${file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')}`,
  }),
});

