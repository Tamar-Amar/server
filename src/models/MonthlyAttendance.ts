import mongoose, { Schema, Document, Types } from 'mongoose';

export interface MonthlyAttendanceDocument extends Document {
  workerId: Types.ObjectId;
  classId: Types.ObjectId;
  month: string; // Format: YYYY-MM
  studentAttendanceDoc?: Types.ObjectId; // Reference to student attendance document
  workerAttendanceDoc?: Types.ObjectId; // Reference to worker attendance document
  controlDoc?: Types.ObjectId; // Optional reference to control document
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyAttendanceSchema: Schema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: 'WorkerAfterNoon', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  month: { type: String, required: true },
  studentAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'Document' },
  workerAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'Document' },
  controlDoc: { type: Schema.Types.ObjectId, ref: 'Document' },
}, {
  timestamps: true
});

// Create compound index for worker and month
MonthlyAttendanceSchema.index({ workerId: 1, month: 1 });
// Create compound index for class and month
MonthlyAttendanceSchema.index({ classId: 1, month: 1 });

export default mongoose.model<MonthlyAttendanceDocument>('MonthlyAttendance', MonthlyAttendanceSchema, 'monthly-attendance-collections'); 