import express from 'express';
import { auth } from '../middleware/auth';
import Student from '../models/Student';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all students
router.get('/students', auth, async (req: AuthRequest, res) => {
  try {
    if (req.student?.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied' });
    }
    
    const students = await Student.find().select('-password');
    res.send(students);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete student
router.delete('/students/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (req.student?.role !== 'admin') {
      return res.status(403).send({ error: 'Access denied' });
    }
    
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).send({ error: 'Student not found' });
    }
    res.send(student);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Add role update endpoint
router.patch('/students/:id/role', auth, async (req: AuthRequest, res) => {
  try {
    if (req.student?.role !== 'admin') {
      return res.status(403).send({ error: 'Admin access required' });
    }
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    );
    
    if (!student) return res.status(404).send();
    res.send(student);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Add status update endpoint
router.patch('/students/:id/status', auth, async (req: AuthRequest, res) => {
  try {
    if (req.student?.role !== 'admin') {
      return res.status(403).send({ error: 'Admin access required' });
    }
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    
    if (!student) return res.status(404).send();
    res.send(student);
  } catch (error) {
    res.status(400).send(error);
  }
});

export default router; 