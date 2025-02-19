import mongoose, { Schema, Document, Types } from 'mongoose';

export interface StoreDocument extends Document {
  name: string;
  address: string;
  businessId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  regularClasses: Types.ObjectId[];
}

const StoreSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  businessId: { type: String },
  contactName: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  regularClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
});

export default mongoose.model<StoreDocument>('Store', StoreSchema, 'stores-collections');
