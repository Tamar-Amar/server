import mongoose from 'mongoose';

const workerTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const WorkerTag = mongoose.model('WorkerTag', workerTagSchema);

export default WorkerTag; 