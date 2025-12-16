const express = require('express');
const router = express.Router();

/**
 * Get Firebase configuration for frontend
 * This endpoint provides dynamic Firebase configuration to avoid hardcoding
 */
router.get('/config', (req, res) => {
  try {
    // Get Firebase config from environment or use defaults
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCpg6ePltV5gShCAzGsL0vTvfNCtX_7WTM",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "tempcomm-35dff.firebaseapp.com",
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://tempcomm-35dff-default-rtdb.firebaseio.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "tempcomm-35dff",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "tempcomm-35dff.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "639642243382",
      appId: process.env.FIREBASE_APP_ID || "1:639642243382:web:eb5318ca6dbb10f4496397"
    };

    // Log configuration request (for debugging)
    console.log('Providing Firebase config for project:', firebaseConfig.projectId);

    res.status(200).json(firebaseConfig);

  } catch (error) {
    console.error('Error providing Firebase config:', error);
    res.status(500).json({
      error: 'Failed to provide Firebase configuration'
    });
  }
});

module.exports = router;