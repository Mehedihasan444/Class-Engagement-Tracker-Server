import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
 
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student',
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
      ret.studentId = ret.studentId.toString();
      return ret;
    }
  }
});

export default mongoose.model('Notification', notificationSchema); 