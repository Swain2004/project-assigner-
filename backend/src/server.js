const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase } = require('./db/init');
const { authenticateSocket } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const documentRoutes = require('./routes/documents');
const templateRoutes = require('./routes/templates');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user?.id;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('join_project', (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on('leave_project', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', () => {});
});

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT) || 5000;

async function start() {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`\n Server running on http://localhost:${PORT}`);
      console.log(` Frontend expected at ${FRONTEND_URL}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();

module.exports = { app, io };
