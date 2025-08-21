import mongoose, { Schema, Document, Types } from 'mongoose';

export interface WorkerAfterNoon extends Document {
  firstName: string;
  lastName: string;
  id: string;
  accountantCode: string;
  modelCode: string;
  projectCodes?: number[]; 
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
  roleName: string;
  is101: boolean;
  lastLogin?: Date;
  
}


const WorkerAfterNoonSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  id: { type: String, unique: true },
  modelCode: { type: String },
  projectCodes: { type: [Number] },
  createDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String },
  phone: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  roleName: { type: String },
  is101: { type: Boolean, default: false },
  lastLogin: { type: Date },
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

WorkerAfterNoonSchema.pre('save', function(next) {
  if (typeof this.roleName === 'string') {
    this.roleName = this.roleName.trim().replace(/\s+/g, ' ');
  }
  next();
});

WorkerAfterNoonSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update && typeof update.roleName === 'string') {
    update.roleName = update.roleName.trim().replace(/\s+/g, ' ');
  }
  next();
});

WorkerAfterNoonSchema.index({ id: 1 });
WorkerAfterNoonSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.model<WorkerAfterNoon>('WorkerAfterNoon', WorkerAfterNoonSchema, 'workers-after-noon-collections'); 