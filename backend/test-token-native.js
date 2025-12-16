const http = require('http');
const querystring = require('querystring');

async function testChatToken() {
  const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjUzNTc0NzUsImV4cCI6MTc2Nzk0OTQ3NX0.7F5UYMsl_mMs-Q5-ymR7xGNu8onuvT2gJZRikqkGY-g';
  
  const params = querystring.stringify({
    userId: '6937ca8a627f152384ac1884',
    eventId: '693bb754eb012d2a43551197'
  });
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/chat/token?${params}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log('🔍 Testing chat token endpoint...');
  console.log('Request:', options.method, options.path);
  console.log('Token:', JWT_TOKEN.substring(0, 50) + '...');
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Response received!');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      console.log('Body:', data);
      
      try {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('🎉 SUCCESS! Chat token generated:', parsed.token?.substring(0, 50) + '...');
        } else {
          console.log('❌ ERROR:', parsed.error || 'Unknown error');
        }
      } catch (e) {
        console.log('⚠️  Response not JSON:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });
  
  req.end();
}

testChatToken();