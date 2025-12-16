const jwt = require('jsonwebtoken');

const JWT_SECRET = '47ca73e6baa9b4d6c15b7e0bcbe12910a493752f5c48c37a9b5c0097dcd4542f';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjUzNTc0NzUsImV4cCI6MTc2Nzk0OTQ3NX0.7F5UYMsl_mMs-Q5-ymR7xGNu8onuvT2gJZRikqkGY-g';

try {
  const decoded = jwt.verify(TOKEN, JWT_SECRET);
  console.log('✅ JWT Token decoded successfully!');
  console.log('Decoded payload:', decoded);
  console.log('User ID from token:', decoded.userId);
} catch (error) {
  console.error('❌ JWT Token verification failed:', error.message);
}