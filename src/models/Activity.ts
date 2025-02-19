import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ActivityDocument extends Document {
  classId: Types.ObjectId;
  operatorId: Types.ObjectId;
  date: Date;
  description?: string;
}

const ActivitySchema: Schema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  operatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: true },
  date: { type: Date, required: true },
  description: { type: String },
});

ActivitySchema.index({ classId: 1 });
ActivitySchema.index({ operatorId: 1 });

export default mongoose.model<ActivityDocument>('Activity', ActivitySchema, 'activities-collections');
