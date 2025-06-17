import mongoose, { Schema, Document } from 'mongoose';

export interface ICoordinator extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

const CoordinatorSchema = new Schema<ICoordinator>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
});

export default mongoose.model<ICoordinator>('Coordinator', CoordinatorSchema); 