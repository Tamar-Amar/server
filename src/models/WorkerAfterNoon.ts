import mongoose, { Schema, Document } from 'mongoose';

export interface WorkerAfterNoon extends Document {
  firstName: string;
  lastName: string;
  id: string;
  accountantCode: string;
  project: string;
  createDate: Date; 
  updateDate: Date;
  updateBy: string;
  startDate: Date;
  endDate: Date;
  status: string;
  phone: string;
  email?: string;
  isActive: boolean;
  notes?: string;
  roleType: string;
  roleName: string;
}

const WorkerAfterNoonSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  accountantCode: { type: String },
  project: { type: String },
  createDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String },
  phone: { type: String, required: true },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  roleType: { type: String },
  roleName: { type: String },
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

WorkerAfterNoonSchema.index({ id: 1 });
WorkerAfterNoonSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.model<WorkerAfterNoon>('WorkerAfterNoon', WorkerAfterNoonSchema, 'workers-after-noon-collections'); 