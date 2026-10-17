import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const parsed = z.object({
      username: z.string().trim().min(1).max(80),
      password: z.string().min(1).max(200)
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Username and password are required.' });

    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = ? LIMIT 1',
      [parsed.data.username]
    );
    const user = rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
