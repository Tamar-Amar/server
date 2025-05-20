import mongoose, { Schema, Document } from 'mongoose';

export interface EmailLogDocument extends Document {
  date: Date;
  operatorIds: string[];
  subject?: string;
  message?: string;
  month?: string;
  type: 'pdf' | 'text';
  results: {
    operatorId: string;
    email: string;
    success: boolean;
    error?: string;
  }[];
}

const EmailLogSchema = new Schema<EmailLogDocument>({
  date: { type: Date, default: Date.now },
  operatorIds: [{ type: String, required: true }],
  subject: { type: String },
  message: { type: String },
  month: { type: String },
  type: { type: String, enum: ['pdf', 'text'], required: true },
  results: [
    {
      operatorId: { type: String, required: true },
      email: { type: String, required: true },
      success: { type: Boolean, required: true },
      error: { type: String },
    },
  ],
});

export default mongoose.model<EmailLogDocument>('EmailLog', EmailLogSchema, 'email-logs');