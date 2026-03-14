'use strict';

const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const path         = require('path');
const http         = require('http');
const { Server }   = require('socket.io');

const authRoutes     = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const ownerRoutes    = require('./routes/owner');
const chatRoutes     = require('./routes/chat');
const eventsRoutes   = require('./routes/events');
const voiceRoutes    = require('./routes/voice');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'ggui-portal-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 8 }
});
app.use(sessionMiddleware);
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ── Presence ───────────────────────────────────────────────
const onlineUsers = new Map(); // username -> { role, socketId, connectedAt }

function getOnlineList() {
  return Array.from(onlineUsers.entries()).map(([username, d]) => ({
    username, role: d.role, connectedAt: d.connectedAt
  }));
}

// ── Chat history ───────────────────────────────────────────
const chatHistory = [];
function addChatMessage(msg) {
  chatHistory.push(msg);
  if (chatHistory.length > 100) chatHistory.shift();
}

// ── Active voice calls ─────────────────────────────────────
// Map of callId -> { caller, callee, startedAt }
const activeCalls = new Map();

app.locals.io            = io;
app.locals.onlineUsers   = onlineUsers;
app.locals.getOnlineList = getOnlineList;
app.locals.chatHistory   = chatHistory;
app.locals.activeCalls   = activeCalls;

// ── Socket.io ──────────────────────────────────────────────
io.on('connection', (socket) => {
  const user = socket.request.session && socket.request.session.user;
  if (!user) return socket.disconnect(true);

  const { username, role } = user;

  // Register presence
  onlineUsers.set(username, { role, socketId: socket.id, connectedAt: new Date().toISOString() });
  io.emit('presence:update', getOnlineList());
  socket.emit('chat:history', chatHistory);

  // ── Chat ────────────────────────────────────────────────
  socket.on('chat:message', (data) => {
    if (!data || typeof data.text !== 'string') return;
    const text = data.text.trim().substring(0, 1000);
    if (!text) return;
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      username, role, text,
      createdAt: new Date().toISOString()
    };
    addChatMessage(msg);
    io.emit('chat:message', msg);
  });

  // ── WebRTC Signaling ─────────────────────────────────────

  // Step 1: Caller sends call request to callee
  socket.on('voice:call-request', ({ to }) => {
    const target = onlineUsers.get(to);
    if (!target) return socket.emit('voice:error', { message: `${to} is not online.` });

    // Check if either party is already in a call
    for (const [, call] of activeCalls) {
      if (call.caller === username || call.callee === username) {
        return socket.emit('voice:error', { message: 'You are already in a call.' });
      }
      if (call.caller === to || call.callee === to) {
        return socket.emit('voice:error', { message: `${to} is already in a call.` });
      }
    }

    const callId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    // Store pending call
    activeCalls.set(callId, { caller: username, callee: to, startedAt: null, pending: true });

    // Notify callee
    io.to(target.socketId).emit('voice:incoming-call', {
      callId,
      from: username,
      fromRole: role
    });

    // Tell caller the callId and to wait
    socket.emit('voice:call-pending', { callId, to });
  });

  // Step 2: Callee accepts
  socket.on('voice:accept', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    call.pending   = false;
    call.startedAt = new Date().toISOString();
    activeCalls.set(callId, call);

    const callerEntry = onlineUsers.get(call.caller);
    if (!callerEntry) return;

    // Tell both parties to start WebRTC
    socket.emit('voice:start', { callId, initiator: false, peerUsername: call.caller });
    io.to(callerEntry.socketId).emit('voice:start', { callId, initiator: true, peerUsername: call.callee });

    // Update presence so others can see who's in a call
    io.emit('presence:update', getOnlineList());
  });

  // Step 3: Callee declines
  socket.on('voice:decline', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    activeCalls.delete(callId);

    const callerEntry = onlineUsers.get(call.caller);
    if (callerEntry) {
      io.to(callerEntry.socketId).emit('voice:declined', { callId, by: username });
    }
  });

  // Step 4: WebRTC offer (caller -> callee)
  socket.on('voice:offer', ({ callId, offer }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    const peer = username === call.caller ? call.callee : call.caller;
    const peerEntry = onlineUsers.get(peer);
    if (peerEntry) io.to(peerEntry.socketId).emit('voice:offer', { callId, offer });
  });

  // Step 5: WebRTC answer (callee -> caller)
  socket.on('voice:answer', ({ callId, answer }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    const peer = username === call.caller ? call.callee : call.caller;
    const peerEntry = onlineUsers.get(peer);
    if (peerEntry) io.to(peerEntry.socketId).emit('voice:answer', { callId, answer });
  });

  // Step 6: ICE candidates (both directions)
  socket.on('voice:ice-candidate', ({ callId, candidate }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    const peer = username === call.caller ? call.callee : call.caller;
    const peerEntry = onlineUsers.get(peer);
    if (peerEntry) io.to(peerEntry.socketId).emit('voice:ice-candidate', { callId, candidate });
  });

  // Step 7: Either party hangs up
  socket.on('voice:hangup', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    activeCalls.delete(callId);

    const peer = username === call.caller ? call.callee : call.caller;
    const peerEntry = onlineUsers.get(peer);
    if (peerEntry) io.to(peerEntry.socketId).emit('voice:hangup', { callId });

    io.emit('presence:update', getOnlineList());
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    const entry = onlineUsers.get(username);
    if (entry && entry.socketId === socket.id) {
      onlineUsers.delete(username);

      // Auto-end any active call this user was in
      for (const [callId, call] of activeCalls) {
        if (call.caller === username || call.callee === username) {
          const peer = username === call.caller ? call.callee : call.caller;
          const peerEntry = onlineUsers.get(peer);
          if (peerEntry) io.to(peerEntry.socketId).emit('voice:hangup', { callId });
          activeCalls.delete(callId);
        }
      }
    }
    io.emit('presence:update', getOnlineList());
  });
});

// Routes
app.use('/', authRoutes);
app.use('/employee', employeeRoutes);
app.use('/owner', ownerRoutes);
app.use('/chat', chatRoutes);
app.use('/events', eventsRoutes);
app.use('/voice', voiceRoutes);

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role === 'owner') return res.redirect('/owner/dashboard');
  return res.redirect('/employee/suggest-website');
});

app.use((req, res) => res.status(404).render('404', { title: '404 — Page Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', message: 'Something went wrong.' });
});

server.listen(PORT, () => console.log(`G.GUI Dev Portal running on port ${PORT}`));
