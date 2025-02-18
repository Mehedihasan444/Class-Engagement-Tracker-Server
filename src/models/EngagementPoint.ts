import mongoose from 'mongoose';

const engagementPointSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  points: { 
    type: Number, 
    required: true,
    min: 1,
    max: 10
  },
  reason: { 
    type: String, 
    required: true,
    minlength: 10
  },
  section: {
    type: String,
    required: true
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('EngagementPoint', engagementPointSchema); 