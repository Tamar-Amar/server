import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export enum DocumentStatus {
  PENDING = 'ממתין',
  APPROVED = 'מאושר',
  REJECTED = 'נדחה',
  EXPIRED = 'פג תוקף'
}

export enum DocumentType {
  ID = 'תעודת זהות',
  RESUME = 'קורות חיים',
  CRIMINAL_RECORD = 'תעודת יושר',
  BANK_DETAILS = 'פרטי בנק',
  POLICE_APPROVAL = 'אישור משטרה',
  TEACHING_CERTIFICATE = 'תעודת השכלה',
  OTHER = 'אחר'
}

export const REQUIRED_DOCUMENTS = [
  DocumentType.POLICE_APPROVAL,
  DocumentType.TEACHING_CERTIFICATE
];

export interface Document extends MongooseDocument {
  operatorId: Types.ObjectId;
  tag: string;
  fileName: String,
  fileType: string;
  size: number;
  s3Key: String,
  uploadedAt: Date;
  uploadedBy: string,
  isTemporary: boolean;
  status: DocumentStatus;
  expiryDate: Date;
  comments: string;
}

const DocumentSchema = new Schema<Document>({
  operatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: true },
  tag: { type: String },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  isTemporary: { type: Boolean, default: false },
  status: { type: String, enum: Object.values(DocumentStatus), default: DocumentStatus.PENDING },
  expiryDate: { type: Date },
  comments: { type: String },
});

DocumentSchema.index({ operatorId: 1 });

export default mongoose.model<Document>('Document', DocumentSchema, 'documents-collections');
