/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auth, AuthRequest } from '../middleware/auth';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import Student from '../models/Student';
const router = express.Router();

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.NODE_ENV === 'production' ? 'https://class-engagement-tracker-server.vercel.app/api/auth/google/callback': '/api/auth/google/callback',
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let student = await Student.findOne({ email: profile.emails?.[0].value });
    
    
    if (!student) {
      student = new Student({
        name: profile.displayName,
        email: profile.emails?.[0].value,
        password: await bcrypt.hash(uuidv4(), 8),
        role: 'user',
        googleId: profile.id,
        classSection: "",
        studentId: ""
      });
      await student.save();
    }

    return done(null, student);
  } catch (error) {
    return done(error);
  }
}));

router.post('/register', async (req, res) => {
  try {
    const { studentId, name, classSection, email, password } = req.body;
    
    const existingStudent = await Student.findOne({ $or: [{ email }, { studentId }] });
    if (existingStudent) {
      return res.status(400).send({ error: 'Student already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const student = new Student({
      studentId,
      name,
      classSection,
      email,
      password: hashedPassword,
      role: (await Student.countDocuments()) === 0 ? 'admin' : 'user'
    });

    await student.save();
    const token = jwt.sign({ 
      _id: student._id, 
      role: student.role,
      classSection: student.classSection
    }, process.env.JWT_SECRET!);
    res.status(201).send({ student, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    
    if (!student || !(await bcrypt.compare(password, student.password))) {
      return res.status(401).send({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      _id: student._id, 
      role: student.role,
      classSection: student.classSection
    }, process.env.JWT_SECRET!);
    res.send({ student, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post('/logout', auth, async (req, res) => {
  res.send({ message: 'Logged out successfully' });
});

router.get('/verify', auth, (req: AuthRequest, res) => {
  res.send({ valid: true });
});

router.get('/me', auth, async (req: AuthRequest, res) => {
  try {
    const student = await Student.findById(req.student?._id).select('-password');
    if (!student) throw new Error();
    res.send(student);
  } catch (error) {
    res.status(404).send({ error: 'User not found' });
  }
});

router.patch('/me', auth, async (req: AuthRequest, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'classSection'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    const student = await Student.findById(req.student?._id);
    if (!student) throw new Error();
    
    updates.forEach(update => {
      (student as any)[update] = req.body[update];
    });
    await student.save();
    const token = jwt.sign({ _id: student._id, role: student.role }, process.env.JWT_SECRET!);
    res.send({ student, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.patch('/update-password', auth, async (req: AuthRequest, res) => {
  try {
    const student = await Student.findById(req.student?._id);
    if (!student) throw new Error();
    
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, student.password))) {
      return res.status(401).send({ error: 'Current password is incorrect' });
    }
    
    student.password = await bcrypt.hash(newPassword, 8);
    await student.save();
    res.send({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.patch('/mandatory-update', auth, async (req: AuthRequest, res) => {
  try {
    const student = await Student.findById(req.student?._id);
    if (!student) throw new Error();
    
    const { studentId, classSection } = req.body;
    
    // Add validation for non-empty strings
    if (!studentId?.trim() || !classSection?.trim()) {
      return res.status(400).send({ error: 'All fields are required' });
    }

    // Check for existing student ID
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
      return res.status(400).send({ 
        error: 'Student ID already exists',
        field: 'studentId'
      });
    }

    student.studentId = studentId.trim();
    student.classSection = classSection.trim();
    await student.save();

    // Return updated student data
    const updatedStudent = await Student.findById(student._id).select('-password');
    
    const token = jwt.sign({ 
      _id: student._id,
      role: student.role,
      classSection: student.classSection
    }, process.env.JWT_SECRET!);

    res.send({ student: updatedStudent, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Add routes
router.get('/google', passport.authenticate('google'));
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign({ 
      _id: (req.user as any)._id,
      role: (req.user as any).role,
      classSection: (req.user as any).classSection
    }, process.env.JWT_SECRET!);
    
    // Redirect to client-side success page with token
    res.redirect(`${process.env.CORS_ORIGIN}/auth/google/callback?token=${token}`);
  }
);

router.get('/api/auth/google/success', async (req, res) => {
  const token = req.query.token;
  const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { _id: string };
  const student = await Student.findById(decoded._id).select('-password');
  

  res.send(`
    <script>
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        token: '${token}',
        student: ${JSON.stringify(student)}
      }, '*');
      window.close();
    </script>
  `);
});

export default router; 