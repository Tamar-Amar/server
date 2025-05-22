
import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export interface Document extends MongooseDocument {
  operatorId: Types.ObjectId;
  tag: string;
  name: string;
  originalName: string;
  fileType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

const DocumentSchema = new Schema<Document>({
  operatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: true },
  tag: { type: String, required: true },
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model<Document>('Document', DocumentSchema, 'documents-collections');
