// Simple Socket.io connection test using Node.js built-in modules
const WebSocket = require('ws');
const http = require('http');

console.log('🔌 Testing Socket.io connection...');

// Test 1: Check if server is running
const checkServer = http.get('http://localhost:5000/api/health', (res) => {
  if (res.statusCode >= 200 && res.statusCode < 400) {
    console.log('✅ Backend server is running on port 5000');
    
    // Test 2: Try WebSocket connection
    setTimeout(() => {
      try {
        const ws = new WebSocket('ws://localhost:5000/socket.io/?transport=websocket');
        
        ws.on('open', () => {
          console.log('✅ WebSocket connection established');
          console.log('📤 Sending Socket.io handshake...');
          
          // Socket.io handshake packet
          ws.send('42["connection"]');
        });
        
        ws.on('message', (data) => {
          console.log('📨 Received:', data.toString());
        });
        
        ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
        });
        
        ws.on('close', () => {
          console.log('🔌 WebSocket connection closed');
        });
        
        // Close after 5 seconds
        setTimeout(() => {
          ws.close();
          process.exit(0);
        }, 5000);
        
      } catch (error) {
        console.error('❌ WebSocket creation failed:', error.message);
      }
    }, 1000);
    
  } else {
    console.log('❌ Backend server not responding correctly');
  }
});

checkServer.on('error', (error) => {
  console.error('❌ Cannot connect to backend server:', error.message);
  console.log('💡 Make sure your backend server is running: npm run dev');
});

console.log('💡 If you see this but no connection messages:');
console.log('   1. Start your backend server: cd backend && npm run dev');
console.log('   2. Check if port 5000 is available');
console.log('   3. Look for Socket.io initialization in server logs');