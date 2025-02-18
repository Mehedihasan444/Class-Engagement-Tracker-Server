import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';

interface JwtPayload {
  _id: string;
  role: string;
  classSection: string;
}

export interface AuthRequest extends Request {
  student?: JwtPayload;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const student = await Student.findById(decoded._id).select('-password');
    
    if (!student) throw new Error();
    req.student = {
      _id: student._id.toString(),
      role: student.role,
      classSection: student.classSection
    };
    next();
  } catch (err) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.student?.role !== 'admin') {
    return res.status(403).send({ error: 'Admin access required' });
  }
  next();
};

export const checkStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findById(req.student?._id);
    if (!student || student.status !== 'active') {
      return res.status(403).send({ error: 'Account is suspended' });
    }
    next();
  } catch (error) {
    res.status(500).send({ error: 'Status check failed' });
  }
}; 