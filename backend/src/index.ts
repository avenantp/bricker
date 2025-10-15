import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MCPServerManager } from './mcp/mcp-manager.js';
import { AssistantHandler } from './assistant/handler.js';
import { createAssistantRouter } from './routes/assistant.js';
import githubRouter from './routes/github.js';
import datasetsRouter from './routes/datasets.js';
import sourceControlSyncRouter from './routes/source-control-sync.js';
import {
  changeTrackingMiddleware,
  requestLoggerMiddleware,
} from './middleware/change-tracking.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error-handler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(changeTrackingMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('[Server] Starting Uroq Backend API...');

    // Initialize MCP Server Manager
    const mcpManager = new MCPServerManager([
      'schema-analyzer',
      'pattern-library',
      'model-generator',
      'databricks-optimizer',
    ]);

    console.log('[Server] Initializing MCP servers...');
    await mcpManager.initialize();

    // Initialize Assistant Handler
    const assistantHandler = new AssistantHandler(mcpManager);

    // Set up routes
    app.use('/api/assistant', createAssistantRouter(assistantHandler, mcpManager));
    app.use('/api/github', githubRouter);
    app.use('/api/datasets', datasetsRouter);
    app.use('/api/source-control-sync', sourceControlSyncRouter);

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        name: 'Uroq Backend API',
        version: '1.0.0',
        description: 'Databricks automation script generator with AI assistant',
        endpoints: {
          health: '/health',
          assistant: '/api/assistant/*',
          github: '/api/github/*',
          datasets: '/api/datasets/*',
          sourceControlSync: '/api/source-control-sync/*',
        },
      });
    });

    // 404 handler (must be after all routes)
    app.use(notFoundHandler);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`[Server] ✓ Backend API listening on port ${PORT}`);
      console.log(`[Server] ✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] ✓ Ready to accept requests`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[Server] Shutting down gracefully...');
      await mcpManager.close();
      server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n[Server] SIGTERM received, shutting down...');
      await mcpManager.close();
      server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

startServer();
