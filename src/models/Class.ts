import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ClassDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  isSpecialEducation: boolean;
  gender: 'בנים' | 'בנות';
  address: string;
  uniqueSymbol: string;
  chosenStore: Types.ObjectId;
  institutionId: Types.ObjectId;
  type: 'כיתה' | 'גן';
  hasAfternoonCare: boolean;
  AfternoonOpenDate?: Date;
  monthlyBudget: number;
  childresAmount?: number;
  regularOperatorId: Types.ObjectId;
  isActive: boolean;
  contactsId: Types.ObjectId[]; 
  description: string;
}

const ClassSchema: Schema = new Schema({
  address: { type: String, required: false },
  name: { type: String, required: true },
  isSpecialEducation: { type: Boolean, required: true },
  gender: { type: String, enum: ['בנים', 'בנות'], required: true },
  uniqueSymbol: { type: String, required: true, unique: true },
  chosenStore: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  regularOperatorId: { type: Schema.Types.ObjectId, ref: 'Operator', required: false }, 
  type: { type: String, enum: ['כיתה', 'גן'], required: true },
  hasAfternoonCare: { type: Boolean, default: false },
  monthlyBudget: { type: Number },
  childresAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, 
  AfternoonOpenDate: { type: Date },
  contactsId: [{ type: Schema.Types.ObjectId, ref: 'Contact' }],  
  description: { type: String, required: false },  
});

ClassSchema.index({ institutionId: 1 }); 
ClassSchema.index({ isActive: 1 });
ClassSchema.index({ uniqueSymbol: 1 }, { unique: true });

ClassSchema.pre('save', function (next) {
  if (this.type === 'כיתה') {
    this.monthlyBudget = 250;
  } else if (this.type === 'גן') {
    this.monthlyBudget = 200;
  }
  next();
});

export default mongoose.model<ClassDocument>('Class', ClassSchema, 'classes-collections');
