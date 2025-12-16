#!/usr/bin/env node

/**
 * Firebase API Key Test Script
 * Tests if the current Web API key is valid
 */

const https = require('https');

// Current API key from environment files
const currentApiKey = "AIzaSyCpg6ePltV5gShCAzGsL0vTvfNCtX_7WTM";

console.log('🔍 Testing Firebase Web API Key...\n');
console.log(`API Key: ${currentApiKey}`);
console.log(`Project: tempcomm-35dff\n`);

// Test Firebase Project Config endpoint
const testUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${currentApiKey}`;

console.log('📡 Testing endpoint:', testUrl);
console.log('Expected: 200 OK with project configuration\n');

https.get(testUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode}`);
        console.log(`📏 Response Size: ${data.length} bytes\n`);
        
        if (res.statusCode === 200) {
            console.log('✅ SUCCESS: API key is valid!');
            try {
                const json = JSON.parse(data);
                console.log('✅ Project ID:', json.projectId);
                console.log('✅ Authorized Domains found:', json.authorizedDomains ? 'Yes' : 'No');
                console.log('✅ ReCAPTCHA Site Key found:', json.recaptchaSiteKey ? 'Yes' : 'No');
            } catch (e) {
                console.log('⚠️  Response is not valid JSON');
            }
        } else {
            console.log('❌ ERROR: API key validation failed');
            try {
                const error = JSON.parse(data);
                console.log('❌ Error Code:', error.error?.code);
                console.log('❌ Error Message:', error.error?.message);
            } catch (e) {
                console.log('❌ Error Response:', data);
            }
        }
        
        console.log('\n📝 Next Steps:');
        if (res.statusCode === 200) {
            console.log('✅ Your API key is working correctly');
            console.log('✅ No need to update the API key');
            console.log('✅ The 400 errors might be coming from elsewhere');
        } else {
            console.log('❌ Your API key needs to be updated');
            console.log('📖 Follow the guide: FIREBASE_WEB_API_KEY_UPDATE.md');
            console.log('🔑 Get the correct Web API key from Firebase Console');
        }
    });
}).on('error', (err) => {
    console.log('❌ Network Error:', err.message);
    console.log('\n📝 Next Steps:');
    console.log('❌ Check your internet connection');
    console.log('❌ Verify the API key format');
    console.log('📖 Follow the guide: FIREBASE_WEB_API_KEY_UPDATE.md');
});