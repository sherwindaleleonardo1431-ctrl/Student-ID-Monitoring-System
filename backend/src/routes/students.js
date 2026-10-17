import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const studentSchema = z.object({
  student_id_number: z.string().trim().min(1).max(40),
  full_name: z.string().trim().min(2).max(180),
  course_grade: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(120),
  id_status: z.enum(['active', 'pending']).default('pending'),
  date_registered: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

router.get('/', async (req, res, next) => {
  try {
    const search = `%${String(req.query.search || '').trim()}%`;
    const status = ['active', 'pending'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '25', 10) || 25));
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT id, student_id_number, full_name, course_grade, department, id_status, date_registered
       FROM students
       WHERE (student_id_number LIKE ? OR full_name LIKE ? OR department LIKE ?)
       AND (? IS NULL OR id_status = ?)
       ORDER BY full_name LIMIT ? OFFSET ?`,
      [search, search, search, status, status, limit, offset]
    );
    res.json({ data: rows, page, limit });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const parsed = studentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid student data.', details: parsed.error.flatten() });
    const s = parsed.data;
    const [result] = await pool.execute(
      `INSERT INTO students (student_id_number, full_name, course_grade, department, id_status, date_registered)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))`,
      [s.student_id_number, s.full_name, s.course_grade, s.department, s.id_status, s.date_registered || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Student created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Student ID number already exists.' });
    next(err);
  }
});

router.put('/:id', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const parsed = studentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid student data.', details: parsed.error.flatten() });
    const s = parsed.data;
    const [result] = await pool.execute(
      `UPDATE students SET student_id_number=?, full_name=?, course_grade=?, department=?, id_status=?,
       date_registered=COALESCE(?, date_registered) WHERE id=?`,
      [s.student_id_number, s.full_name, s.course_grade, s.department, s.id_status, s.date_registered || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Student ID number already exists.' });
    next(err);
  }
});

router.delete('/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const [logs] = await pool.execute('SELECT id FROM attendance_logs WHERE student_id=? LIMIT 1', [req.params.id]);
    if (logs.length) return res.status(409).json({ error: 'Cannot delete a student with attendance history. Consider marking the ID pending instead.' });
    const [result] = await pool.execute('DELETE FROM students WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student deleted.' });
  } catch (err) { next(err); }
});

export default router;
