import { Request, Response } from 'express';
import Document from '../models/Document';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadDocument = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const { operatorId, tag } = req.body;
    const file = req.file;

    if (!file || !operatorId || !tag) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }

    const isTemporary = operatorId.startsWith('temp-');

    if (!(file as any).path) {
      res.status(500).json({ error: 'File upload to Cloudinary failed' });
      return;
    }

    const newDocument = new Document({
      operatorId,
      tag,
      name: `${tag} - ${new Date().toLocaleDateString()}`,
      originalName: file.originalname,
      fileType: file.mimetype,
      size: file.size,
      url: (file as any).path,
      uploadedAt: new Date(),
      isTemporary: isTemporary
    });

    const savedDocument = await newDocument.save();
    res.status(201).json(savedDocument);
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getDocumentsByOperator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { operatorId } = req.params;
    const docs = await Document.find({ operatorId });
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateOperatorDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tempId, newOperatorId } = req.body;

    if (!tempId || !newOperatorId) {
      res.status(400).json({ error: 'Missing tempId or newOperatorId' });
      return;
    }

    const result = await Document.updateMany(
      { operatorId: tempId },
      { 
        $set: { 
          operatorId: newOperatorId,
          isTemporary: false 
        } 
      }
    );

    res.status(200).json({ 
      message: 'Documents updated successfully',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
