import express from 'express';
import { AuthRequest } from '../middleware/auth';
import EngagementPoint from '../models/EngagementPoint';
import { auth } from '../middleware/auth';
import mongoose from 'mongoose';
import { checkStatus } from '../middleware/auth';


const router = express.Router();

// Add points
router.post('/', auth, checkStatus, async (req: AuthRequest, res) => {
  try {
    const points = Number(req.body.points);
    if (isNaN(points) || points < 1 || points > 10) {
      return res.status(400).send({ error: 'Invalid points value' });
    }

    const point = new EngagementPoint({
      points,
      reason: req.body.reason,
      section: req.body.section || req.student?.classSection,
      studentId: req.student?._id
    });

    const savedPoint = await point.save();
    res.status(201).send(savedPoint);

  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).send({ error: messages.join(', ') });
    }
    res.status(400).send({ error: 'Failed to save points entry' });
  }
});

// Get points history
router.get('/history', auth, async (req: AuthRequest, res) => {
  try {
    const points = await EngagementPoint.find({ studentId: req.student?._id })
      .sort({ date: -1 })
      .populate({
        path: 'studentId',
        select: 'name studentId classSection'
      });
      
    console.log('Fetched history for:', req.student?._id, 'Entries:', points.length);
    res.send(points);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).send({ error: 'Failed to load history' });
  }
});

// Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const leaderboard = await EngagementPoint.aggregate([
      {
        $group: {
          _id: '$studentId',
          totalPoints: { $sum: '$points' }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          'student.password': 0,
          'student.__v': 0,
          'student.googleId': 0
        }
      },
      { $sort: { totalPoints: -1 } },
      {
        $group: {
          _id: null,
          rankings: { $push: '$$ROOT' }
        }
      },
      {
        $addFields: {
          rankings: {
            $map: {
              input: '$rankings',
              as: 'rank',
              in: {
                $mergeObjects: [
                  '$$rank',
                  { rank: { $add: [ { $indexOfArray: [ '$rankings.totalPoints', '$$rank.totalPoints' ] }, 1 ] } }
                ]
              }
            }
          }
        }
      },
      { $unwind: '$rankings' },
      { $replaceRoot: { newRoot: '$rankings' } }
    ]);
    
    res.send(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).send({ error: 'Failed to load leaderboard' });
  }
});

// Delete points entry (admin only)
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const point = await EngagementPoint.findById(req.params.id);
    if (!point) return res.status(404).send();

    // Allow only owner or admin
    if (point.studentId.toString() !== req.student?._id && req.student?.role !== 'admin') {
      return res.status(403).send({ error: 'Unauthorized' });
    }

    await EngagementPoint.deleteOne({ _id: point._id });
    res.send(point);
  } catch (error) {
    res.status(500).send();
  }
});

router.patch('/:id', auth, checkStatus, async (req: AuthRequest, res) => {
  try {
    const { points, reason } = req.body;
    
    // Validate points
    if (typeof points !== 'number' || points < 1 || points > 10) {
      return res.status(400).send({ error: 'Points must be between 1-10' });
    }

    // Validate reason
    if (typeof reason !== 'string' || reason.length < 10) {
      return res.status(400).send({ error: 'Reason must be at least 10 characters' });
    }

    const updated = await EngagementPoint.findByIdAndUpdate(
      req.params.id,
      { points, reason },
      { new: true, runValidators: true }
    );
    
    res.send(updated);
  } catch (error) {
    res.status(400).send(error);
  }
});

export default router; 