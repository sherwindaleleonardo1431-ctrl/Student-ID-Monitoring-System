import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const [[students]] = await pool.query(`SELECT COUNT(*) AS total_students,
      SUM(id_status='active') AS active_ids, SUM(id_status='pending') AS pending_ids FROM students`);
    const [[attendance]] = await pool.query(`SELECT COUNT(*) AS today's_attendance FROM attendance_logs WHERE \`date\`=CURRENT_DATE`);
    const [recent] = await pool.query(`SELECT s.student_id_number, s.full_name, a.time_in, a.time_out, a.status, a.date
      FROM attendance_logs a JOIN students s ON s.id=a.student_id ORDER BY a.time_in DESC LIMIT 10`);
    res.json({
      totalStudents: Number(students.total_students || 0),
      activeIds: Number(students.active_ids || 0),
      pendingIds: Number(students.pending_ids || 0),
      todaysAttendance: Number(attendance.todays_attendance || 0),
      recentActivity: recent
    });
  } catch (err) { next(err); }
});

export default router;
