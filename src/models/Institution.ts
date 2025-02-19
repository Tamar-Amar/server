import mongoose, { Schema, Document, Types } from 'mongoose';

export interface InstitutionDocument extends Document {
  institutionCode: string;
  institutionSymbol?: string;
  name: string;
  contacts: Types.ObjectId[]; 
  isActive: boolean;
}

const InstitutionSchema: Schema = new Schema({
  institutionCode: { type: String, required: true, default: '0000' },
  name: { type: String, required: true },
  institutionSymbol: { type: String },
  contacts: [{ type: Schema.Types.ObjectId, ref: 'Contact' }], 
  isActive: { type: Boolean, default: true }, 
});

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema, 'institutions-collections');
