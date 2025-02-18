import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';
import { auth, AuthRequest } from '../middleware/auth';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback',
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
        googleId: profile.id
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

router.get('/verify', auth, async (req: AuthRequest, res) => {
  try {
    const student = await Student.findById(req.student?._id).select('-password');
    if (!student) throw new Error();
    res.send(student);
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate' });
  }
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

// Add routes
router.get('/google', passport.authenticate('google'));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign({ _id: (req.user as any)._id }, process.env.JWT_SECRET!);
    res.redirect(`/auth/google/success?token=${token}`);
  }
);

router.get('/google/success', async (req, res) => {
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