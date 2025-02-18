import express from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import { auth, adminAuth } from '../middleware/auth';

const router = express.Router();

// Get all students (admin only)
router.get('/', auth, adminAuth, async (req: AuthRequest, res) => {
  try {
    const students = await Student.find().select('-password');
    res.send(students);
  } catch (error) {
    res.status(500).send();
  }
});

// Update student (admin only)
router.patch('/:id', auth, adminAuth, async (req: AuthRequest, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'classSection', 'role'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).send();
    
    updates.forEach(update => {
      (student as any)[update] = req.body[update];
    });
    
    await student.save();
    res.send(student);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete student (admin only)
router.delete('/:id', auth, adminAuth, async (req: AuthRequest, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).send();
    res.send(student);
  } catch (error) {
    res.status(500).send();
  }
});

export default router; 