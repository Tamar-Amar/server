// src/models/Purchase.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface PurchaseDocument extends Document {
  classId: string;
  storeId: string;
  invoiceId: string;
  purchaseDate: Date;
  amount: number;
  actualamount: number;
  description: string;
}

const PurchaseSchema: Schema = new Schema({
    amount: { type: Number, required: true },
    actualUsage: { type: Number, default: null },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true }, 
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true }, 
    date: { type: Date, required: true }, 
    description: { type: String, default: '' }, 
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null }, 
  });
  

export default mongoose.model<PurchaseDocument>('Purchase', PurchaseSchema, 'purchases-collections');
