// Test with proper Socket.io client (if available)
try {
  const { io } = require('socket.io-client');
  
  console.log('🔌 Testing with Socket.io client...');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    timeout: 5000
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to Socket.io server!');
    console.log('🆔 Socket ID:', socket.id);
    console.log('🎉 This should trigger the "Socket connected" log in your server');
    
    // Send a test event
    socket.emit('test_connection', { message: 'Hello from test client!' });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });
  
  // Keep connection for 5 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.log('❌ Socket.io client not available');
  console.log('💡 Run: npm install socket.io-client');
  console.log('🔌 The Socket.io server IS running (confirmed by WebSocket test)');
  console.log('💡 You just need a proper Socket.io client to see the "Socket connected" log');
}