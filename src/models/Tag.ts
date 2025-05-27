import mongoose, { Schema, Document } from 'mongoose';

export interface TagDocument extends Document {
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

const TagSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Index for faster lookups
TagSchema.index({ name: 1 });

export default mongoose.model<TagDocument>('Tag', TagSchema, 'tags-collections'); 