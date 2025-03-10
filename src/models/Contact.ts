import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ContactDocument extends Document {
  name: string;
  phone: string;
  email: string;
  description?: string;
  entityType: "Institution" | "Store" | "Class";
  entityId: Types.ObjectId;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String },
  entityType: { type: String, enum: ["Institution", "Store", "Class"], required: true }, // סוג ישות
  entityId: { type: Schema.Types.ObjectId, required: true }, // מזהה ישות
});

export default mongoose.model<ContactDocument>('Contact', ContactSchema, 'contacts-collections');
