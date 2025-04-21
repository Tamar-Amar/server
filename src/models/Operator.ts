// src/models/Operator.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

interface BusinessDetails {
  businessId: string;
  businessName: string;
}

interface WeeklySchedule {
  day: 'ראשון' | 'שני' | 'שלישי' | 'רביעי' | 'חמישי';
  classes: Types.ObjectId[];
}

export interface OperatorDocument extends Document {
  firstName: string;
  lastName: string;
  password: string;
  id: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: string;
  signDate: Date;
  paymentMethod: 'חשבונית' | 'תלוש' | 'לא נבחר';
  businessDetails?: BusinessDetails;
  bankDetailsId: Types.ObjectId;
  regularClasses: Types.ObjectId[];
  gender: 'בנים' | 'בנות' | 'גם וגם'; 
  educationType: 'רגיל' | 'מיוחד' | 'גם וגם'; 
  isActive: boolean;
  weeklySchedule: WeeklySchedule[];
}

const BusinessDetailsSchema: Schema = new Schema({
  businessId: { type: String, required: true },
  businessName: { type: String, required: true },
});

const WeeklyScheduleSchema: Schema = new Schema({
  day: { type: String, enum: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'], required: true },
  classes: [{ type: Schema.Types.ObjectId, ref: 'Class', maxlength: 4 }]
});

const OperatorSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String },
  signDate: { type: Date, required: true },
  id: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  description: { type: String },
  paymentMethod: { type: String, enum: ['חשבונית', 'תלוש', 'לא נבחר'], required: true },
  businessDetails: { type: BusinessDetailsSchema, required: false },
  bankDetailsId: { type: Schema.Types.ObjectId, ref: 'BankDetails', required: true },
  regularClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
  gender: { type: String, enum: ['בנים', 'בנות', 'גם וגם'], required: true, default: 'גם וגם' },
  educationType: { type: String, enum: ['רגיל', 'מיוחד', 'גם וגם'], required: true, default: 'גם וגם' }, 
  isActive:{type: Boolean, default: true},
  weeklySchedule: { type: [WeeklyScheduleSchema], default: [] } 
});

export default mongoose.model<OperatorDocument>('Operator', OperatorSchema, 'operators-collections');
