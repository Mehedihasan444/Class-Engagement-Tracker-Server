import express from 'express';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

const router = express.Router();



// Get user's notifications
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const notifications = await Notification.find({ 
      studentId: req.student?._id 
    }).sort({ createdAt: -1 });
    
    res.send(notifications);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student?._id },
      { read: true },
      { new: true }
    );
    
    if (!notification) return res.status(404).send();
    res.send(notification);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update notification' });
  }
});

export default router; 