# Community App - Full Stack Boilerplate

A comprehensive full-stack community application built with Next.js (frontend), Node.js/Express (backend), and MongoDB. This boilerplate provides a solid foundation for building community-driven applications with user authentication, posts, comments, and social features.

## 🚀 Features

### Frontend (Next.js)
- **Modern React Framework**: Built with Next.js 14 for optimal performance
- **JavaScript Support**: Clean JavaScript without TypeScript complexity
- **Responsive Design**: Tailwind CSS for responsive and modern UI
- **Authentication Context**: React Context for managing authentication state
- **Form Handling**: React Hook Form with validation
- **UI Components**: Headless UI and Heroicons for accessible components
- **Animations**: Framer Motion for smooth animations
- **Toast Notifications**: React Hot Toast for user feedback

### Backend (Node.js/Express)
- **RESTful API**: Well-structured API endpoints
- **Authentication**: JWT-based authentication system
- **Data Models**: User, Post, and Comment models with Mongoose
- **Database**: MongoDB with proper indexing and relationships
- **Security**: Helmet, CORS, rate limiting, and input validation
- **File Uploads**: Cloudinary integration for image handling
- **Error Handling**: Comprehensive error handling middleware
- **Logging**: Morgan for API request logging

### Database (MongoDB)
- **User Management**: User profiles with social features (follow/unfollow)
- **Posts System**: Full CRUD operations for posts with categories and tags
- **Comments**: Threaded comment system with replies
- **Social Features**: Like/unlike posts and comments
- **Search**: Text search capabilities
- **Pagination**: Efficient data pagination

## 📁 Project Structure

```
commapp/
├── frontend/                 # Next.js frontend application
│   ├── components/           # React components
│   ├── contexts/            # React contexts (AuthContext)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Next.js pages
│   ├── styles/             # Global styles and Tailwind CSS
│   ├── utils/              # Utility functions
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   ├── next.config.js      # Next.js configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── postcss.config.js   # PostCSS configuration
│
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── models/         # Mongoose models (User, Post, Comment)
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware (auth, validation)
│   │   ├── controllers/    # Route controllers
│   │   └── utils/          # Utility functions
│   ├── uploads/            # File uploads directory
│   ├── package.json        # Backend dependencies
│   └── server.js           # Main server file
│
└── README.md               # Project documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd commapp
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `backend/.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/community_app

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Start Backend Server
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

### 4. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `frontend/.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Community App
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_TIMEOUT=10000
```

#### Start Frontend Development Server
```bash
npm run dev
```

The frontend application will start on `http://localhost:3000`

### 5. Database Setup

Make sure MongoDB is running on your system. You can:
- Install MongoDB locally
- Use MongoDB Atlas (cloud service)
- Use Docker with MongoDB

For local MongoDB installation:
```bash
# macOS (with Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download and install from https://www.mongodb.com/try/download/community
```

### 6. Run Both Servers Simultaneously

From the root directory:
```bash
npm run dev
```

This will start both frontend and backend servers concurrently.

## 📋 Available Scripts

### Root (/)
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only frontend development server
- `npm run dev:backend` - Start only backend development server
- `npm run build` - Build both applications
- `npm run start` - Start both applications in production mode
- `npm run install:all` - Install dependencies for all packages

### Frontend (frontend/)
- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend (backend/)
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (currently no tests configured)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/follow/:id` - Follow/unfollow user
- `GET /api/users/search/:query` - Search users

### Posts
- `GET /api/posts` - Get all posts (with pagination)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/user/:userId` - Get posts by user

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments` - Create new comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like/unlike comment

## 🎨 Styling

The project uses Tailwind CSS with a custom design system:
- **Colors**: Primary blue color palette
- **Typography**: Inter font family
- **Components**: Custom CSS classes for buttons, forms, and cards
- **Responsive**: Mobile-first responsive design

## 🔒 Security Features

- **Authentication**: JWT tokens with secure expiration
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Express-validator for request validation
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers
- **Password Hashing**: bcrypt for secure password storage

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Use PM2 or similar process manager
3. Configure reverse proxy (nginx)
4. Set up MongoDB (Atlas recommended)

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or similar platform
3. Configure environment variables
4. Set up custom domain

## 📝 Development Notes

- **Frontend**: Uses Next.js Pages Router with JavaScript (no TypeScript)
- **Backend**: RESTful API following best practices
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based stateless authentication
- **File Uploads**: Cloudinary integration (configure your credentials)
- **Error Handling**: Comprehensive error handling throughout
- **Logging**: Morgan for API request logging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the configuration files
2. Ensure all dependencies are installed
3. Verify MongoDB is running
4. Check environment variables
5. Review the API endpoints and frontend components

## 🔄 Next Steps

This boilerplate provides a solid foundation. You can extend it with:
- Email notifications
- Real-time features (Socket.io)
- Advanced search and filtering
- Image optimization
- Caching strategies
- Testing suite
- CI/CD pipeline
- Admin dashboard
- Mobile app (React Native)

Happy coding! 🎉