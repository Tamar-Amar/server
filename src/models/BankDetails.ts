import mongoose, { Schema, Document, Types } from 'mongoose';

export interface BankDetailsDocument extends Document {
  operator_id: Types.ObjectId;
  bankName: string;
  accountNumber: string;
  branchNumber: string;
}

const BankDetailsSchema: Schema = new Schema({
  operator_id: { type: Schema.Types.ObjectId, ref: 'Operator', required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  branchNumber: { type: String, required: true },
});

export default mongoose.model<BankDetailsDocument>('BankDetails', BankDetailsSchema, 'bank-details-collections');
