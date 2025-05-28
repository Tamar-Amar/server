import { Request, Response, RequestHandler } from 'express';
import DocumentModel, { DocumentStatus, DocumentType } from '../models/Document';
import { uploadFileToS3, deleteFileFromS3, getSignedUrl } from '../services/s3Service';

interface RequestWithUser extends Request {
  user?: { id: string };
  file?: Express.Multer.File;
}

type ExpressResponse = Response<any, Record<string, any>>;

// העלאת מסמך חדש
export const uploadDocument: RequestHandler = async (req: RequestWithUser, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'לא נבחר קובץ' });
      return;
    }

    const { workerId, documentType, expiryDate } = req.body;
    const { buffer, originalname, mimetype, size } = req.file;

    if (!workerId || !documentType) {
      res.status(400).json({ error: 'חסרים פרטים חובה' });
      return;
    }

    const s3Key = await uploadFileToS3(buffer, originalname, mimetype);

    const doc = await DocumentModel.create({
      operatorId: workerId,
      fileName: originalname,
      originalName: originalname,
      fileType: mimetype,
      size: size,
      documentType,
      s3Key,
      expiryDate,
      uploadedBy: req.user?.id || 'system',
      tag: documentType,
      status: DocumentStatus.PENDING
    });

    res.status(201).json(doc);
  } catch (err: unknown) {
    console.error('Error in uploadDocument:', err);
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

// קבלת כל המסמכים של עובד
export const getWorkerDocuments: RequestHandler = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const documents = await DocumentModel.find({ workerId });
    
    // הוספת URL חתום לכל מסמך
    const docsWithUrls = await Promise.all(documents.map(async (doc) => {
      const url = await getSignedUrl(doc.s3Key as string);
      return { ...doc.toObject(), url };
    }));

    res.json(docsWithUrls);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};

// עדכון סטטוס מסמך
export const updateDocumentStatus: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status, comments } = req.body;

    const doc = await DocumentModel.findByIdAndUpdate(
      documentId,
      { status, comments },
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

// מחיקת מסמך
export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      res.status(404).json({ error: 'מסמך לא נמצא' });
      return;
    }

    // מחיקה מ-S3
    await deleteFileFromS3(doc.s3Key as string);
    
    // מחיקה מהדאטהבייס
    await DocumentModel.findByIdAndDelete(doc._id);

    res.json({ message: 'מסמך נמחק בהצלחה' });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'שגיאה לא ידועה';
    res.status(500).json({ error });
  }
};
