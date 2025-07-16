import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ClassDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  education: string;
  gender: 'בנים' | 'בנות';
  address: string;
  street?: string;
  streetNumber?: string;
  uniqueSymbol: string;
  chosenStore?: Types.ObjectId;
  type: 'כיתה' | 'גן';
  hasAfternoonCare: boolean;
  AfternoonOpenDate?: Date;
  monthlyBudget: number;
  childresAmount?: number;
  projectCodes?: number[];
  regularOperatorId?: Types.ObjectId;
  isActive: boolean;
  description: string;
  workers: Array<{
    workerId: Types.ObjectId;
    roleType: string;
    project: number;
  }>;
  institutionName: string;
  institutionCode: string;
  coordinatorId?: Types.ObjectId;
}

const ClassSchema: Schema = new Schema({
  address: { type: String, required: false },
  street: { type: String, required: false },
  streetNumber: { type: String, required: false },
  projectCodes: { type: [Number], required: false },
  name: { type: String, required: true },
  education: { type: String, required: true },
  gender: { type: String, enum: ['בנים', 'בנות'], required: true },
  uniqueSymbol: { type: String, required: true, unique: true },
  chosenStore: { type: Schema.Types.ObjectId, ref: 'Store', required: false },
  institutionName: { type: String, required: true },
  institutionCode: { type: String, required: true },
  regularOperatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: false }, 
  type: { type: String, enum: ['כיתה', 'גן'], required: true },
  hasAfternoonCare: { type: Boolean, default: false },
  monthlyBudget: { type: Number, required: false },
  childresAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, 
  AfternoonOpenDate: { type: Date , required: false},
  description: { type: String, required: false },  
  workers: [{
    workerId: { type: Schema.Types.ObjectId, ref: 'WorkerAfterNoon' },
    roleType: { type: String },
    project: { type: Number }
  }],
  coordinatorId: { type: Schema.Types.ObjectId, ref: 'Coordinator', required: false },
});

ClassSchema.index({ institutionId: 1 }); 
ClassSchema.index({ isActive: 1 });
ClassSchema.pre('save', function (next) {
  if (this.type === 'כיתה') {
    this.monthlyBudget = 250;
  } else if (this.type === 'גן') {
    this.monthlyBudget = 200;
  }
  next();
});

export default mongoose.model<ClassDocument>('Class', ClassSchema, 'classes-collections');
