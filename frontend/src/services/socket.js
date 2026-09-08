import { io } from 'socket.io-client';

// Connect dynamically to current host or fallback to 3001 in dev
const URL = (window.location.hostname === 'localhost' && window.location.port === '3000')
  ? 'http://localhost:3001'
  : (window.location.origin || 'http://localhost:3001');

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('[Socket] Connected to Fivecord server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});
