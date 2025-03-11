import mongoose, { Schema, Document } from 'mongoose';

export interface BankDetailsDocument extends Document {
  bankName: string;
  accountNumber: string;
  branchNumber: string;
}

const BankDetailsSchema: Schema = new Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  branchNumber: { type: String, required: true },
});

export default mongoose.model<BankDetailsDocument>('BankDetails', BankDetailsSchema, 'bank-details-collections');
