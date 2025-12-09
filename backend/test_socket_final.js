// Direct Socket.io connection test
const WebSocket = require('ws');

console.log('🔌 Testing Socket.io connection directly...');

try {
  // Connect directly to Socket.io endpoint
  const ws = new WebSocket('ws://localhost:5000/socket.io/?transport=websocket&EIO=4');
  
  let connected = false;
  
  ws.on('open', () => {
    console.log('✅ WebSocket connection opened');
    connected = true;
    
    // Send Socket.io handshake
    console.log('📤 Sending Socket.io handshake...');
    ws.send('0{"sid":"test","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}');
  });
  
  ws.on('message', (data) => {
    console.log('📨 Raw message received:', data.toString());
    
    // Parse Socket.io message
    const message = data.toString();
    if (message.startsWith('0{')) {
      console.log('✅ Socket.io handshake successful!');
      console.log('🎉 Socket.io server is running and accepting connections');
      
      // Send connection event
      setTimeout(() => {
        console.log('📤 Sending connection event...');
        ws.send('42["connection"]');
      }, 1000);
    } else if (message.startsWith('42')) {
      console.log('✅ Connection event acknowledged by server');
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    if (!connected) {
      console.log('💡 Possible issues:');
      console.log('   1. Socket.io not properly initialized');
      console.log('   2. Port 5000 not accessible');
      console.log('   3. CORS configuration issue');
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket closed:', code, reason.toString());
  });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    if (!connected) {
      console.log('⏰ Connection timeout - Socket.io may not be running');
    }
    ws.close();
    process.exit(0);
  }, 10000);
  
} catch (error) {
  console.error('❌ Failed to create WebSocket:', error.message);
  console.log('💡 Make sure your backend server is running: npm run dev');
}