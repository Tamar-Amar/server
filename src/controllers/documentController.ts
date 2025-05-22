import { Request, Response } from 'express';
import Document from '../models/Document';

interface MulterRequest extends Request {
  file: Express.Multer.File;
}

export const uploadDocument = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const { operatorId, tag } = req.body;
    const file = req.file;

    if (!file || !operatorId || !tag) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }

    const newDocument = new Document({
      operatorId,
      tag,
      name: tag + ' - ' + new Date().toLocaleDateString(),
      originalName: file.originalname,
      fileType: file.mimetype,
      size: file.size,
      url: file.path,
    });

    await newDocument.save();
    res.status(201).json(newDocument);
  } catch (err) {
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
