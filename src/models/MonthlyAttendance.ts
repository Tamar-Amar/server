import mongoose, { Schema, Document, Types } from 'mongoose';

export interface MonthlyAttendanceDocument extends Document {
  workerId: Types.ObjectId;
  uniqueSymbol: string;
  month: string; // Format: YYYY-MM
  projectCode: number;
  studentAttendanceDoc?: Types.ObjectId; // Reference to student attendance document
  workerAttendanceDoc?: Types.ObjectId; // Reference to worker attendance document
  controlDocs?: Types.ObjectId[]; // Up to 5 control documents
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyAttendanceSchema: Schema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: 'WorkerAfterNoon', required: true },
  uniqueSymbol: { type: String, required: true },
  month: { type: String, required: true },
  projectCode: { type: Number, required: true },
  studentAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'Document' },
  workerAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'Document' },
  controlDocs: [{ type: Schema.Types.ObjectId, ref: 'Document' }], // מערך של דוחות בקרה
}, {
  timestamps: true
});

// Create compound index for worker and month
MonthlyAttendanceSchema.index({ workerId: 1, month: 1 });
// Create compound index for class and month
MonthlyAttendanceSchema.index({ uniqueSymbol: 1, month: 1 });

export default mongoose.model<MonthlyAttendanceDocument>('MonthlyAttendance', MonthlyAttendanceSchema, 'monthly-attendance-collections'); 