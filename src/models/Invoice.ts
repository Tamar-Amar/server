// src/models/Invoice.ts
import mongoose, { Schema, Document } from 'mongoose';


enum InvoiceType {
    CHARGE = 'חיוב',
    CREDIT = 'זיכוי',
    }

enum InvoiceStatus {
    NOT_RECEIVED = 'לא התקבלה',
    RECEIVED = 'התקבלה',
    PAYED = 'הוכנסה ךלדאטה',
    PAID = 'שולמה',
  }

enum typeVat {
    Y2024 = 17,
    Y2025 = 18,
  }

export interface InvoiceDocument extends Document {
  storeId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  typeVat: typeVat;
  status:InvoiceStatus;
  type: InvoiceType;
}

const InvoiceSchema: Schema = new Schema({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true }, 
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true }, 
    typeVat: {
      type: Number,
      enum: [17, 18],
      default: 17,
    },
    status: {
      type: String,
      enum: ['לא התקבלה', 'התקבלה', 'הוכנסה לדאטה', 'שולמה'],
      default: 'לא התקבלה',
    },
    type: {
      type: String,
      enum: ['חיוב', 'זיכוי'],
      required: true,   
    },
    
  });
  

export default mongoose.model<InvoiceDocument>('Invoice', InvoiceSchema, 'invoices-collections');
