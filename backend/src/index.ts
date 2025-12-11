import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import Firebase config to initialize it
import './config/firebase';

// Import routes
import geminiRoutes from './routes/gemini';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow requests from frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Allow large payloads for images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AllSports Backend',
  });
});

// API routes
app.use('/api/gemini', geminiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 AllSports Backend Server');
  console.log('═══════════════════════════════════════');
  console.log(`   Port:     ${PORT}`);
  console.log(`   Mode:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend: ${corsOptions.origin}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health                           - Health check');
  console.log('  POST /api/gemini/generate-match-background    - Generate match poster');
  console.log('  POST /api/gemini/generate-program-background  - Generate program poster');
  console.log('');
});

