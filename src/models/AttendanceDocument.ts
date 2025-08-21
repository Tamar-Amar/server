import mongoose, { Schema, Document, Types } from 'mongoose';

export interface AttendanceDocumentDocument extends Document {
  operatorId: Types.ObjectId;
  classId: Types.ObjectId;
  projectCode: number;
  month: string; // YYYY-MM
  type: 'נוכחות עובדים' | 'נוכחות תלמידים' | 'מסמך בקרה';
  fileName: string;
  fileType: string;
  s3Key: string;
  uploadedAt: Date;
  status: string;
  comments?: string;
  tz: string;
  uploadedBy?: Types.ObjectId;
}

const AttendanceDocumentSchema: Schema = new Schema({
  operatorId: { type: Schema.Types.ObjectId, ref: 'WorkerAfterNoon', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  projectCode: { type: Number, required: true },
  month: { type: String, required: true },
  type: { type: String, enum: ['נוכחות עובדים', 'נוכחות תלמידים', 'מסמך בקרה'], required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  s3Key: { type: String, required: true },
  uploadedAt: { type: Date, required: true },
  status: { type: String, required: true, default: 'ממתין' },
  comments: { type: String },
  tz: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true
});

const generateFileName = async function(this: any) {
  try {
    const Class = mongoose.model('Class');
    const classDoc = await Class.findById(this.classId);
    
    if (!classDoc) {
      return;
    }
    
    const typeMap: { [key: string]: string } = {
      'נוכחות עובדים': 'workers',
      'נוכחות תלמידים': 'students', 
      'מסמך בקרה': 'control'
    };
    
    const englishType = typeMap[this.type] || 'unknown';
    
    const fileName = `${classDoc.uniqueSymbol}_project${this.projectCode}_${englishType}_${this.month}`;
    
    this.fileName = fileName;
    
  } catch (error) {
    console.error('שגיאה ביצירת שם מסמך:', error);
  }
};

AttendanceDocumentSchema.pre('save', generateFileName);

export default mongoose.model<AttendanceDocumentDocument>('AttendanceDocument', AttendanceDocumentSchema, 'attendance-documents'); 