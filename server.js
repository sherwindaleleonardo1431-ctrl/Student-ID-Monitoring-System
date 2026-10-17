const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

// Inside your /api/attendance/scan controller:
io.emit('attendance_scanned', { student, log, type: scanType });