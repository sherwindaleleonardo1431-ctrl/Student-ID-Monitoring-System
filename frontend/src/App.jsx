import { useEffect, useState } from 'react';
import { api, getToken } from './api.js';

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [scanId, setScanId] = useState('');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [studentForm, setStudentForm] = useState({ student_id_number: '', full_name: '', course_grade: '', department: '', id_status: 'active' });

  async function loadDashboard() {
    const data = await api('/dashboard/summary');
    setSummary(data);
  }
  async function loadStudents() {
    const data = await api(`/students?search=${encodeURIComponent(search)}`);
    setStudents(data.data || []);
  }
  async function loadLogs() {
    const data = await api('/attendance');
    setLogs(data.data || []);
  }
  async function refresh() {
    try { await Promise.all([loadDashboard(), loadStudents(), loadLogs()]); }
    catch (e) { setMessage(e.message); }
  }
  useEffect(() => { if (token) refresh(); }, [token]);
  async function doLogin(e) {
    e.preventDefault(); setMessage('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(login) });
      localStorage.setItem('zppsu_token', data.token); setToken(data.token); setUser(data.user);
    } catch (e) { setMessage(e.message); }
  }
  async function addStudent(e) {
    e.preventDefault();
    try {
      await api('/students', { method: 'POST', body: JSON.stringify(studentForm) });
      setMessage('Student added successfully.');
      setStudentForm({ student_id_number: '', full_name: '', course_grade: '', department: '', id_status: 'active' });
      await refresh();
    } catch (e) { setMessage(e.message); }
  }
  async function scan(e) {
    e.preventDefault();
    try {
      const data = await api('/attendance/scan', { method: 'POST', body: JSON.stringify({ studentIdNumber: scanId }) });
      setMessage(`${data.action === 'time-in' ? 'Time-in recorded' : 'Time-out recorded'}: ${data.student.full_name}`);
      setScanId(''); await refresh();
    } catch (e) { setMessage(e.message); }
  }
  async function removeStudent(id) {
    if (!confirm('Delete this student? This is only allowed when there are no attendance logs.')) return;
    try { await api(`/students/${id}`, { method: 'DELETE' }); setMessage('Student deleted.'); await refresh(); }
    catch (e) { setMessage(e.message); }
  }
  async function exportCsv() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/attendance/export.csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Could not export report.');
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'attendance-report.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setMessage(e.message); }
  }
  if (!token) return <main className="login-wrap"><form className="login-card" onSubmit={doLogin}>
    <div className="brand-mark">Z</div><p className="eyebrow">ZPPSU • CAMPUS SECURITY</p><h1>Student ID Monitoring</h1>
    <p className="muted">Sign in with your authorized school account.</p>
    <label>Username<input required value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} /></label>
    <label>Password<input required type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /></label>
    <button className="primary full">Sign in</button>{message && <p className="message">{message}</p>}
  </form></main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="side-brand"><div className="brand-mark small">Z</div><div><b>ZPPSU</b><small>Student Monitoring</small></div></div>
      <p className="nav-label">WORKSPACE</p>
      {['dashboard', 'students', 'attendance'].map(t => <button key={t} className={`nav-item ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>{t === 'dashboard' ? '▦' : t === 'students' ? '♙' : '◷'} <span>{t[0].toUpperCase() + t.slice(1)}</span></button>)}
      <div className="side-bottom"><small>Authorized access only</small><button className="logout" onClick={() => { localStorage.removeItem('zppsu_token'); setToken(null); setUser(null); }}>Log out ↗</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div><p className="eyebrow">CAMPUS OPERATIONS</p><h2>{tab === 'dashboard' ? 'Dashboard overview' : tab === 'students' ? 'Student directory' : 'Attendance records'}</h2></div><div className="user-chip"><span className="avatar">A</span><div><b>{user?.username || 'Authorized user'}</b><small>Signed in</small></div></div></header>
      {message && <div className="notice"><span>{message}</span><button onClick={() => setMessage('')}>×</button></div>}
      {tab === 'dashboard' && <><div className="welcome"><div><p className="eyebrow light">ZAMBOANGA PENINSULA POLYTECHNIC STATE UNIVERSITY</p><h1>Good day, campus team.</h1><p>Monitor student ID status and daily campus entry activity in one place.</p></div><div className="welcome-icon">◉</div></div>
        <section className="stats-grid">{[['Total Students', summary?.totalStudents ?? '—', 'Registered records'], ['Active IDs', summary?.activeIds ?? '—', 'Approved for entry'], ['Pending IDs', summary?.pendingIds ?? '—', 'Needs verification'], ["Today's Attendance", summary?.todaysAttendance ?? '—', 'Daily entry records']].map(([label, value, note], i) => <article className="stat-card" key={label}><div className={`stat-icon icon-${i}`}>{['♙', '✓', '◷', '↔'][i]}</div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</section>
        <section className="panel scan-panel"><div><p className="eyebrow">QUICK VERIFICATION</p><h3>Scan or enter Student ID</h3><p className="muted">First scan records time-in. The next scan records time-out.</p></div><form onSubmit={scan} className="scan-form"><input autoFocus placeholder="Enter student ID number" value={scanId} onChange={e => setScanId(e.target.value)} required/><button className="primary">Verify ID →</button></form></section>
        <section className="panel"><div className="panel-head"><div><h3>Recent campus activity</h3><p className="muted">Latest recorded student movements</p></div><button className="text-button" onClick={() => setTab('attendance')}>View all →</button></div><LogTable rows={(summary?.recentActivity || [])}/></section>
      </>}
      {tab === 'students' && <><section className="panel"><div className="panel-head"><div><h3>Add student record</h3><p className="muted">Enter official student ID information.</p></div></div><form className="student-form" onSubmit={addStudent}>{[['student_id_number','Student ID Number'],['full_name','Full Name'],['course_grade','Course / Grade'],['department','Department']].map(([key,label])=><label key={key}>{label}<input required value={studentForm[key]} onChange={e => setStudentForm({...studentForm,[key]:e.target.value})}/></label>)}<label>ID Status<select value={studentForm.id_status} onChange={e => setStudentForm({...studentForm,id_status:e.target.value})}><option value="active">Active</option><option value="pending">Pending</option></select></label><button className="primary">Add student +</button></form></section><section className="panel"><div className="panel-head"><div><h3>Registered students</h3><p className="muted">{students.length} record(s) shown</p></div><input className="search" placeholder="Search name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadStudents()}/><button className="secondary" onClick={loadStudents}>Search</button></div><div className="table-wrap"><table><thead><tr><th>Student</th><th>ID Number</th><th>Course / Grade</th><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>{students.map(s=><tr key={s.id}><td><b>{s.full_name}</b></td><td>{s.student_id_number}</td><td>{s.course_grade}</td><td>{s.department}</td><td><span className={`status ${s.id_status}`}>{s.id_status}</span></td><td><button className="delete-btn" onClick={() => removeStudent(s.id)}>Delete</button></td></tr>)}</tbody></table></div></section></>}
      {tab === 'attendance' && <section className="panel"><div className="panel-head"><div><h3>Attendance & entry/exit logs</h3><p className="muted">Records from the attendance database.</p></div><button className="primary" onClick={exportCsv}>Export CSV ↓</button></div><LogTable rows={logs}/></section>}
      <footer>Student ID Monitoring System <span>•</span> ZPPSU <span>•</span> Keep student data confidential</footer>
    </main>
  </div>;
}
function LogTable({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Date</th><th>Time-in</th><th>Time-out</th><th>Status</th></tr></thead><tbody>{rows.length ? rows.map((r,i)=><tr key={r.id || `${r.student_id_number}-${i}`}><td><b>{r.full_name}</b></td><td>{r.student_id_number}</td><td>{String(r.date || '').slice(0,10) || '—'}</td><td>{r.time_in ? new Date(r.time_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td><td>{r.time_out ? new Date(r.time_out).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td><td><span className={`status ${r.status === 'inside' ? 'active' : 'pending'}`}>{r.status || '—'}</span></td></tr>) : <tr><td colSpan="6" className="empty">No attendance records yet.</td></tr>}</tbody></table></div>;
}
