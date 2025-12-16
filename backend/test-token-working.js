const axios = require('axios');

async function testChatToken() {
  const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjUzNTc0NzUsImV4cCI6MTc2Nzk0OTQ3NX0.7F5UYMsl_mMs-Q5-ymR7xGNu8onuvT2gJZRikqkGY-g';
  
  try {
    console.log('🔍 Testing chat token endpoint...');
    console.log('Token:', JWT_TOKEN.substring(0, 50) + '...');
    
    const response = await axios.get('http://localhost:5000/chat/token', {
      params: {
        userId: '6937ca8a627f152384ac1884',
        eventId: '693bb754eb012d2a43551197'
      },
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

testChatToken();