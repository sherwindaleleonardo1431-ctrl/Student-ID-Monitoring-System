import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/scan', allowRoles('admin', 'security', 'staff'), async (req, res, next) => {
  const parsed = z.object({ studentIdNumber: z.string().trim().min(1).max(40) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Student ID number is required.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [students] = await conn.execute(
      'SELECT id, student_id_number, full_name, id_status, course_grade, department FROM students WHERE student_id_number=? FOR UPDATE',
      [parsed.data.studentIdNumber]
    );
    const student = students[0];
    if (!student) { await conn.rollback(); return res.status(404).json({ error: 'Student ID is not registered.' }); }
    if (student.id_status !== 'active') { await conn.rollback(); return res.status(403).json({ error: 'This student ID is pending and cannot be used for entry.' }); }

    const [logs] = await conn.execute(
      'SELECT id, time_in, time_out, status FROM attendance_logs WHERE student_id=? AND `date`=CURRENT_DATE FOR UPDATE',
      [student.id]
    );
    let action;
    let log;
    if (!logs[0]) {
      const [result] = await conn.execute(
        `INSERT INTO attendance_logs (student_id, time_in, status, \`date\`, recorded_by)
         VALUES (?, NOW(), 'inside', CURRENT_DATE, ?)`,
        [student.id, req.user.id]
      );
      action = 'time-in';
      log = { id: result.insertId };
    } else if (!logs[0].time_out) {
      await conn.execute(
        `UPDATE attendance_logs SET time_out=NOW(), status='exited', recorded_by=? WHERE id=?`,
        [req.user.id, logs[0].id]
      );
      action = 'time-out';
      log = { id: logs[0].id };
    } else {
      await conn.rollback();
      return res.status(409).json({ error: 'This student already has a time-in and time-out today.' });
    }
    await conn.commit();
    res.json({ action, student, log });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

router.get('/', allowRoles('admin', 'security', 'staff'), async (req, res, next) => {
  try {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '2000-01-01';
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '2999-12-31';
    const search = `%${String(req.query.search || '').trim()}%`;
    const [rows] = await pool.execute(
      `SELECT a.id, s.student_id_number, s.full_name, s.course_grade, s.department,
       a.time_in, a.time_out, a.status, a.date, u.username AS recorded_by
       FROM attendance_logs a JOIN students s ON s.id=a.student_id
       LEFT JOIN users u ON u.id=a.recorded_by
       WHERE a.date BETWEEN ? AND ?
       AND (s.student_id_number LIKE ? OR s.full_name LIKE ?)
       ORDER BY a.time_in DESC LIMIT 1000`,
      [from, to, search, search]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/export.csv', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '2000-01-01';
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '2999-12-31';
    const [rows] = await pool.execute(
      `SELECT s.student_id_number, s.full_name, s.course_grade, s.department,
       a.date, a.time_in, a.time_out, a.status
       FROM attendance_logs a JOIN students s ON s.id=a.student_id
       WHERE a.date BETWEEN ? AND ? ORDER BY a.date DESC, a.time_in DESC`,
      [from, to]
    );
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Student ID', 'Full Name', 'Course/Grade', 'Department', 'Date', 'Time In', 'Time Out', 'Status'].map(cell).join(','),
      ...rows.map(r => [r.student_id_number, r.full_name, r.course_grade, r.department, r.date, r.time_in, r.time_out, r.status].map(cell).join(','))
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) { next(err); }
});

export default router;
