import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  classSection: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  }
});

export default mongoose.model('Student', studentSchema); 