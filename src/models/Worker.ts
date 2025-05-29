import mongoose, { Schema, Document, Types } from 'mongoose';

interface WeeklySchedule {
  day: 'ראשון' | 'שני' | 'שלישי' | 'רביעי' | 'חמישי';
  classes: Types.ObjectId[];
}

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
  documents: Array<{
    documentId: Types.ObjectId;
    status: 'התקבל' | 'נדחה' | 'אושר' | 'אחר';
  }>;
  registrationDate: Date; // תאריך רישום למערכת
  lastUpdateDate: Date;
  status: string;
  jobType: string;
  jobTitle: string;
  paymentMethod: 'חשבונית' | 'תלוש'; // אופן תשלום
  weeklySchedule: WeeklySchedule[];
  
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

const WorkerDocumentSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
  status: { type: String, enum: ['התקבל', 'נדחה', 'אושר', 'אחר'], default: 'התקבל' }
});

const WeeklyScheduleSchema = new Schema({
  day: { type: String, enum: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'], required: true },
  classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }]
});

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
  documents: [WorkerDocumentSchema],
  registrationDate: { type: Date, default: Date.now },
  lastUpdateDate: { type: Date, default: Date.now },
  status: { type: String, default: 'לא נבחר' },
  jobType: { type: String, default: 'לא נבחר' },
  jobTitle: { type: String, default: 'לא נבחר' },
  paymentMethod: { type: String, enum: ['חשבונית', 'תלוש'], required: true },
  weeklySchedule: { 
    type: [WeeklyScheduleSchema], 
    default: [
      { day: 'ראשון', classes: [] },
      { day: 'שני', classes: [] },
      { day: 'שלישי', classes: [] },
      { day: 'רביעי', classes: [] },
      { day: 'חמישי', classes: [] }
    ]
  },
  
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
WorkerSchema.index({ 'documents.documentId': 1 });

export default mongoose.model<WorkerDocument>('Worker', WorkerSchema, 'workers-collections'); 