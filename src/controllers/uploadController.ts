import multer, { Multer } from 'multer';
import { Request, Response } from 'express';
import { uploadFileToS3 } from '../services/s3Service';
import DocumentModel from '../models/Document';

interface RequestWithUser extends Request {
  user?: { id: string };
  file?: Express.Multer.File;
}

const storage = multer.memoryStorage();
export const upload = multer({ storage }).single('file');

export const uploadFile = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { buffer, originalname, mimetype } = req.file;

    const s3Key = await uploadFileToS3(buffer, originalname, mimetype);

    const doc = await DocumentModel.create({
      fileName: originalname,
      fileType: mimetype,
      s3Key,
      uploadedBy: req.user?.id || null, // או לפי מערכת שלך
    });

    res.status(201).json(doc);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'An unknown error occurred';
    res.status(500).json({ error });
  }
};
