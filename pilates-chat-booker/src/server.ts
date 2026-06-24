import express, { Express, Request, Response, NextFunction } from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';

const app: Express = express();

// Middleware
app.use(express.json());

// Error boundary: Request logging
app.use((req: Request, res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error boundary: 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error boundary: Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(`Unhandled error on ${req.method} ${req.path}:`, err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: config.node_env === 'production' ? 'Internal server error' : err.message,
    path: req.path,
    ...(config.node_env !== 'production' && { stack: err.stack }),
  });
});

// Server startup with explicit error handling
const startServer = (): void => {
  try {
    const server = app.listen(config.port, (): void => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.node_env}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>): void => {
      logger.error('Unhandled Rejection at:', new Error(`${reason}`) as Error);
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error): void => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', (): void => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close((): void => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
};

startServer();
