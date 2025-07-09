import { Request, RequestHandler } from 'express';
import DocumentModel, { Document, DocumentStatus, DocumentType } from '../models/Document';
import { uploadFileToS3, deleteFileFromS3, getSignedUrl } from '../services/s3Service';
import { Types } from 'mongoose';


interface RequestWithUser extends Request {
  user?: { id: string; role: string; idNumber?: string };
  file?: Express.Multer.File;
}

const generateFileName = (tz: string, documentType: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${tz}-${date}`;
};

export const uploadDocument: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }

    const { workerId, documentType, expiryDate, tz } = req.body;
    const { buffer, mimetype, size } = req.file;

    if (!workerId || !documentType) {
      res.status(400).json({ error: 'חסרים פרטים חובה' });
      return;
    }

    try {
      const operatorId = new Types.ObjectId(workerId);
      const newFileName = generateFileName(tz, documentType);
      const s3Key = await uploadFileToS3(buffer, newFileName, mimetype);

      const doc = await DocumentModel.create({
        operatorId,
        fileName: newFileName,
        fileType: mimetype,
        size: size,
        s3Key,
        expiryDate,
        uploadedAt: new Date(),
        uploadedBy: req.user?.id || 'system',
        tag: documentType,
        status: DocumentStatus.PENDING,
        comments: ''
      });

      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        res.status(400).json({ error: 'מזהה עובד לא תקין' });
        return;
      }
      throw error;
    }
  } catch (err: unknown) {
    console.error('Error in uploadDocument:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getWorkerDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    
    try {
      const operatorId = new Types.ObjectId(workerId);
      const documents = await DocumentModel.find({ operatorId });

      const docsWithUrls = await Promise.all(documents.map(async (doc) => {
        const url = await getSignedUrl(doc.s3Key as string);
        return { ...doc.toObject(), url };
      }));

      res.json(docsWithUrls);
    } catch (error) {
      if (error instanceof Error && error.name === 'CastError') {
        res.status(400).json({ error: 'מזהה עובד לא תקין' });
        return;
      }
      throw error;
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const updateDocumentStatus: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status} = req.body;

    const doc = await DocumentModel.findByIdAndUpdate(
      documentId,
      { status },
      { new: true }
    );

    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    res.json(doc);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    await deleteFileFromS3(doc.s3Key as string);
    
    await DocumentModel.findByIdAndDelete(doc._id);

    res.json({ message: 'מסמך נמחק בהצלחה' });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAllDocuments: RequestHandler = async (req, res, next) => {
  try {
    const documents = await DocumentModel.find().lean();

    const docsWithUrls = await Promise.all(documents.map(async (doc: any) => {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
      return doc;
    }));

    res.json(docsWithUrls);

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

export const getAllPersonalDocuments: RequestHandler = async (req, res, next) => {
  try {
    const personalDocTags = [
      "אישור משטרה",
      "תעודת השכלה",
      'חוזה',
      'תעודת זהות'
    ];
    const documents: Document[] = await DocumentModel.find({ tag: { $in: personalDocTags } }).lean();
    for (const doc of documents as any[]) {
      if (doc.s3Key) {
        doc.url = await getSignedUrl(doc.s3Key as string);
      }
    }
    
    res.status(200).json(documents);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};
