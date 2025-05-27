import mongoose, { Schema, Document, Types } from 'mongoose';

export interface WorkerDocument extends Document {
  firstName: string;
  lastName: string;
  id: string; // תעודת זהות
  birthDate: Date;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber?: string;
  workingSymbols: Types.ObjectId[]; // מערך סמלים בהם העובד עובד - איידי של כיתות
  accountantId?: string; // שם חשב השכר
  tags: Types.ObjectId[]; // מערך תגיות (צהרון, קייטנה, בוקר וכו')
  documents: Types.ObjectId[]; // מערך מסמכים
  registrationDate: Date; // תאריך רישום למערכת
  paymentMethod: 'חשבונית' | 'תלוש'; // אופן תשלום
  
  // שדות נוספים שימושיים
  phone: string;
  email?: string;
  isActive: boolean;
  bankDetails?: {
    bankName: string;
    branchNumber: string;
    accountNumber: string;
    accountOwner: string;
  };
  notes?: string;
}

const WorkerSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  birthDate: { type: Date, required: true },
  city: { type: String, required: true },
  street: { type: String, required: true },
  buildingNumber: { type: String, required: true },
  apartmentNumber: { type: String },
  workingSymbols: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
  accountantId: { type: String },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  registrationDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['חשבונית', 'תלוש'], required: true },
  
  // שדות נוספים
  phone: { type: String, required: true },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  bankDetails: {
    bankName: { type: String },
    branchNumber: { type: String },
    accountNumber: { type: String },
    accountOwner: { type: String }
  },
  notes: { type: String }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

// אינדקסים לחיפוש מהיר
WorkerSchema.index({ id: 1 });
WorkerSchema.index({ firstName: 1, lastName: 1 });
WorkerSchema.index({ workingSymbols: 1 });
WorkerSchema.index({ tags: 1 });

export default mongoose.model<WorkerDocument>('Worker', WorkerSchema, 'workers-collections'); 