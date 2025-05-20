import mongoose, { Schema, Document } from 'mongoose';

export interface GlobalFlagDocument extends Document {
  key: string;
  value: string;
}

const GlobalFlagSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

export default mongoose.model<GlobalFlagDocument>('GlobalFlag', GlobalFlagSchema, 'global-flags');
