// src/models/Store.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ContactPerson {
  name: string;
  email: string;
  phone: string;
}

export interface StoreDocument extends Document {
  name: string;
  address: string;
  businessId: string;
  contactPersons: ContactPerson[]; // מערך של אנשי קשר
}

const ContactPersonSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
});

const StoreSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  businessId: { type: String }, // ח.פ
  contactPersons: { type: [ContactPersonSchema], required: true }, // מערך של אנשי קשר
});

export default mongoose.model<StoreDocument>('Store', StoreSchema, 'stores-collections');
