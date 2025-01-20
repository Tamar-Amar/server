// src/models/Operator.ts
import mongoose, { Schema, Document } from 'mongoose';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchNumber: string;
}

interface BusinessDetails {
  businessId: string;
  businessName: string;
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
  paymentMethod: 'חשבונית' | 'תלוש'| 'לא נבחר';
  businessDetails?: BusinessDetails;
  bankDetails: BankDetails;
}

const BankDetailsSchema: Schema = new Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  branchNumber: { type: String, required: true },
});

const BusinessDetailsSchema: Schema = new Schema({
  businessId: { type: String, required: true },
  businessName: { type: String, required: true },
});

const OperatorSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  id: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  paymentMethod: { type: String, enum: ['חשבונית', 'תלוש','לא נבחר'], required: true },
  businessDetails: { type: BusinessDetailsSchema, required: false },
  bankDetails: { type: BankDetailsSchema, required: true },
});

export default mongoose.model<OperatorDocument>('Operator', OperatorSchema, 'operators-collections');
