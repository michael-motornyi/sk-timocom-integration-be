// Load environment variables first
import 'dotenv/config';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

// Import route modules
import coreRoutes from './api/routes/core.js';
import csvRoutes from './api/routes/csv.js';
import generateRoutes from './api/routes/generate.js';
import timocomRoutes from './api/routes/timocom/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/', coreRoutes); // Root and core endpoints
app.use('/api/generate', generateRoutes); // Generation endpoints
app.use('/api/csv', csvRoutes); // CSV management endpoints
app.use('/api/timocom', timocomRoutes); // TIMOCOM API integration

// Sample endpoint removed - data is now returned directly in generation API responses

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    documentation: '/api/docs',
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 TIMOCOM INTEGRATION API running on port ${PORT}`);
  console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Add error handling for server
server.on('error', (err: Error) => {
  console.error('Server error:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
