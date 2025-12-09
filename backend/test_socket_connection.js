const io = require('socket.io-client');

// Test Socket.io connection
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to server with socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Send test message after connection
setTimeout(() => {
  if (socket.connected) {
    console.log('📤 Sending test connection message...');
    socket.emit('test', { message: 'Hello from test client!' });
  }
}, 1000);

// Keep connection alive for 10 seconds
setTimeout(() => {
  console.log('🔌 Closing test connection...');
  socket.disconnect();
  process.exit(0);
}, 10000);

console.log('🔌 Attempting to connect to Socket.io server...');
console.log('💡 If you see this message but no "Connected to server" message, check:');
console.log('   1. Is your backend server running on port 5000?');
console.log('   2. Is Socket.io properly initialized?');
console.log('   3. Are there any CORS errors in the console?');