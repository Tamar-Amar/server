import mongoose, { Schema, Document, Types } from 'mongoose';

export interface WorkerAssignmentDocument extends Document {
  _id: Types.ObjectId;
  workerId: Types.ObjectId;
  classId: Types.ObjectId;
  projectCode: number;
  roleName: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createDate: Date;
  updateDate: Date;
  updateBy: string;
  notes?: string;
}

const WorkerAssignmentSchema: Schema = new Schema({
  workerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'WorkerAfterNoon', 
    required: true 
  },
  classId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  projectCode: { 
    type: Number, 
    required: true 
  },
  roleName: { 
    type: String, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createDate: { 
    type: Date, 
    default: Date.now 
  },
  updateDate: { 
    type: Date, 
    default: Date.now 
  },
  updateBy: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String, 
    required: false 
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

WorkerAssignmentSchema.pre('save', function(next) {
  if (typeof this.roleName === 'string') {
    this.roleName = this.roleName.trim().replace(/\s+/g, ' ');
  }
  this.updateDate = new Date();
  next();
});

WorkerAssignmentSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update && typeof update.roleName === 'string') {
    update.roleName = update.roleName.trim().replace(/\s+/g, ' ');
  }
  if (update) {
    update.updateDate = new Date();
  }
  next();
});

WorkerAssignmentSchema.index({ workerId: 1, isActive: 1 });
WorkerAssignmentSchema.index({ classId: 1, isActive: 1 });
WorkerAssignmentSchema.index({ projectCode: 1, isActive: 1 });
WorkerAssignmentSchema.index({ workerId: 1, classId: 1, projectCode: 1 });
WorkerAssignmentSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model<WorkerAssignmentDocument>('WorkerAssignment', WorkerAssignmentSchema, 'worker-assignments-collections');

