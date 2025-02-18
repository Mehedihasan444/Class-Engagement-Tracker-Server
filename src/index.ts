import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
dotenv.config();
import morgan from 'morgan';
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import pointsRoutes from './routes/points';
import { testConnection } from './db/connect';
import adminRoutes from './routes/admin';


const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI!)
  .then(async () => {
    console.log('Connected to MongoDB via Mongoose');
    await testConnection(); // Run native driver connection test
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 