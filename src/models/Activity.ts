import mongoose, { Schema, Document } from 'mongoose';

export interface ActivityDocument extends Document {
  classId: mongoose.Types.ObjectId; // הכיתה שבה מתקיימת הפעילות
  operatorId: mongoose.Types.ObjectId; // המפעיל של הפעילות
  date: Date; // תאריך הפעילות
  description?: string; // תיאור הפעילות (אופציונלי)
}

const ActivitySchema: Schema = new Schema({
  classId: { type: mongoose.Types.ObjectId, ref: 'Class', required: true }, // מזהה כיתה
  operatorId: { type: mongoose.Types.ObjectId, ref: 'Operator', required: true }, // מזהה מפעיל
  date: { type: Date, required: true }, // תאריך הפעילות
  description: { type: String }, // תיאור הפעילות
});

export default mongoose.model<ActivityDocument>('Activity', ActivitySchema, 'activities-collections');
