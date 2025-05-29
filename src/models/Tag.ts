import mongoose, { Schema, Document } from 'mongoose';

export interface TagDocument extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

// אינדקסים לחיפוש מהיר
TagSchema.index({ name: 1 });
TagSchema.index({ isActive: 1 });

export default mongoose.model<TagDocument>('Tag', TagSchema, 'tags-collections'); 