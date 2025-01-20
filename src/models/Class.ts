// src/models/Class.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ClassDocument extends Document {

  name: string;
  isSpecialEducation: boolean;
  gender: 'בנים' | 'בנות';
  address: string;
  uniqueSymbol: string;
  chosenStore: mongoose.Types.ObjectId;
  institutionId: mongoose.Types.ObjectId;
  type: 'כיתה' | 'גן'; 
  hasAfternoonCare: boolean;
  monthlyBudget: number;
  childresAmount?: number;
}

const ClassSchema: Schema = new Schema({
  address: { type: String, required: false },
  name: { type: String, required: true },
  isSpecialEducation: { type: Boolean, required: true },
  gender: { type: String, enum: ['בנים', 'בנות'], required: true },
  uniqueSymbol: { type: String, required: true },
  chosenStore: { type: mongoose.Types.ObjectId, ref: 'Store', required: true },
  institutionId: { type: mongoose.Types.ObjectId, ref: 'Institution', required: true },
  type: { type: String, enum: ['כיתה', 'גן'], required: true }, 
  hasAfternoonCare: { type: Boolean, default:false}, 
  monthlyBudget: { type: Number }, 
  childresAmount: { type: Number, default: 0 },
});

// הוספת Middleware לחישוב התקציב לפי סוג
ClassSchema.pre('save', function (next) {
  if (this.type === 'כיתה') {
    this.monthlyBudget = 250;
  } else if (this.type === 'גן') {
    this.monthlyBudget = 200;
  }
  next();
});

export default mongoose.model<ClassDocument>('Class', ClassSchema, 'classes-collections');
