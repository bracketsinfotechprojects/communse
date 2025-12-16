// Quick CORS fix - restart your backend server after adding this
// Add this to your server.js CORS configuration:

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:4201', 
    'http://127.0.0.1:4200',
    'http://127.0.0.1:4201',
    // Add any other ports your Angular app might be running on
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Or for development, use this permissive CORS:
/*
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
*/