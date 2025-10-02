import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MCPServerManager } from './mcp/mcp-manager.js';
import { AssistantHandler } from './assistant/handler.js';
import { createAssistantRouter } from './routes/assistant.js';
import githubRouter from './routes/github.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('[Server] Starting Bricker Backend API...');

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

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        name: 'Bricker Backend API',
        version: '1.0.0',
        description: 'Databricks automation script generator with AI assistant',
        endpoints: {
          health: '/health',
          assistant: '/api/assistant/*',
          github: '/api/github/*',
        },
      });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[Server] Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });

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
