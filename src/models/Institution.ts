// src/models/Institution.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface InstitutionDocument extends Document {
  institutionCode: string;
  institutionSymbol?: string;
  name: string;
  coordinator: {
    name: string;
    phone: string;
    email: string;
  };
  
}

const InstitutionSchema: Schema = new Schema({
  institutionCode: { type: String, required: true , default: '0000'},
  name: { type: String, required: true },
  coordinator: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  institutionSymbol: { type: String },
});

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema, 'institutions-collections');
