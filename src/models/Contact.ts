import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ContactDocument extends Document {
  name: string;
  phone: string;
  email: string;
  description: string; 
  institutionId: Types.ObjectId;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String, required: true },
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true }, 
});

export default mongoose.model<ContactDocument>('Contact', ContactSchema, 'contacts-collections');
