// FCM Token Payload Examples for Testing
// ============================================

// Example 1: Web Platform
const webPayload = {
    "token": "fcm_dummy_token_web_sample_123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "platform": "web",
    "deviceId": "test-device-web-1734429610303"
};

// Example 2: Android Platform  
const androidPayload = {
    "token": "fcm_dummy_token_android_sample_987654321zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA987654321zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA987654321zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA987654321zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA987654321",
    "platform": "android",
    "deviceId": "samsung-galaxy-s21-test-98765"
};

// Example 3: iOS Platform
const iosPayload = {
    "token": "fcm_dummy_token_ios_sample_555444333222111000abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ555444333222111000abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ555444333222111000abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ555444333222111000abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ555444333222111000",
    "platform": "ios",
    "deviceId": "iphone-12-pro-simulator-55544"
};

// Generate cURL commands for each example
function generateCurlCommand(payload, authToken = "{{authToken}}", apiUrl = "http://localhost:5000") {
    return `curl -X POST ${apiUrl}/api/notifications/fcm-token \\
  -H "Authorization: Bearer ${authToken}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}

// Display examples
console.log("=== FCM Token Payload Examples ===\n");

console.log("1. Web Platform Payload:");
console.log(JSON.stringify(webPayload, null, 2));
console.log("\n" + generateCurlCommand(webPayload));
console.log("\n" + "=".repeat(80) + "\n");

console.log("2. Android Platform Payload:");
console.log(JSON.stringify(androidPayload, null, 2));
console.log("\n" + generateCurlCommand(androidPayload));
console.log("\n" + "=".repeat(80) + "\n");

console.log("3. iOS Platform Payload:");
console.log(JSON.stringify(iosPayload, null, 2));
console.log("\n" + generateCurlCommand(iosPayload));
console.log("\n" + "=".repeat(80) + "\n");

// Usage instructions
console.log("USAGE INSTRUCTIONS:");
console.log("1. Replace {{authToken}} with your actual JWT token from login");
console.log("2. Replace token values with real FCM tokens from Firebase");
console.log("3. Customize deviceId to match your actual device");
console.log("4. Run the cURL commands to test your API endpoints");

module.exports = {
    webPayload,
    androidPayload,
    iosPayload,
    generateCurlCommand
};