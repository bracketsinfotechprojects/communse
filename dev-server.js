const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.DEV_PORT || 3001;

// Enable CORS for all origins during development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve the main HTML files with proper MIME types
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'multi-user-chat-tester.html'));
});

app.get('/multi-user-chat-tester', (req, res) => {
  res.sendFile(path.join(__dirname, 'multi-user-chat-tester.html'));
});

app.get('/firebase-chat-test-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'firebase-chat-test-ui.html'));
});

app.get('/token-generator', (req, res) => {
  res.sendFile(path.join(__dirname, 'token-generator.html'));
});

console.log(`🚀 Development server running on http://localhost:${PORT}`);
console.log(`📁 Serving files from: ${__dirname}`);
console.log(`🔗 Available pages:`);
console.log(`   - http://localhost:${PORT}/multi-user-chat-tester`);
console.log(`   - http://localhost:${PORT}/firebase-chat-test-ui`);
console.log(`   - http://localhost:${PORT}/token-generator`);

app.listen(PORT, () => {
  console.log(`✅ Development server ready at http://localhost:${PORT}`);
});