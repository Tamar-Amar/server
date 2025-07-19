import mongoose, { Schema, Document, Types } from 'mongoose';

export interface CampAttendanceDocument extends Document {
  projectCode: number;
  classId: Types.ObjectId;
  coordinatorId: Types.ObjectId;
  leaderId: Types.ObjectId;
  month: string; // YYYY-MM
  workerAttendanceDoc: Types.ObjectId;
  studentAttendanceDoc: Types.ObjectId;
  controlDocs?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CampAttendanceSchema: Schema = new Schema({
  projectCode: { type: Number, required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  coordinatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  leaderId: { type: Schema.Types.ObjectId, ref: 'WorkerAfterNoon', required: true },
  month: { type: String, required: true },
  workerAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'AttendanceDocument' },
  studentAttendanceDoc: { type: Schema.Types.ObjectId, ref: 'AttendanceDocument' },
  controlDocs: [{ type: Schema.Types.ObjectId, ref: 'AttendanceDocument' }], // עד 5
}, {
  timestamps: true
});

export default mongoose.model<CampAttendanceDocument>('CampAttendance', CampAttendanceSchema, 'camp-attendance'); 