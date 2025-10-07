import { Router, Request, Response } from 'express';
import { AssistantHandler } from '../assistant/handler.js';
import { MCPServerManager } from '../mcp/mcp-manager.js';

export function createAssistantRouter(
  assistantHandler: AssistantHandler,
  mcpManager: MCPServerManager
): Router {
  const router = Router();

  // Chat endpoint with streaming support
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { workspace_id, message, context, stream = true } = req.body;

      if (!workspace_id || !message) {
        return res.status(400).json({
          error: 'workspace_id and message are required',
        });
      }

      const chatRequest = {
        workspace_id,
        message,
        context,
        stream,
      };

      if (stream) {
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await assistantHandler.handleChat(chatRequest) as any;

        stream.on('text', (text: any) => {
          res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`);
        });

        stream.on('contentBlock', (block: any) => {
          if (block.type === 'tool_use') {
            res.write(
              `data: ${JSON.stringify({ type: 'tool_use', tool: block.name, input: block.input })}\n\n`
            );
          }
        });

        stream.on('message', (message: any) => {
          res.write(`data: ${JSON.stringify({ type: 'message_complete', message })}\n\n`);
        });

        stream.on('error', (error: any) => {
          console.error('[Assistant API] Stream error:', error);
          res.write(
            `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
          );
          res.end();
        });

        stream.on('end', () => {
          res.write('data: [DONE]\n\n');
          res.end();
        });

        // Handle client disconnect
        req.on('close', () => {
          console.log('[Assistant API] Client disconnected');
        });
      } else {
        // Non-streaming response
        const response = await assistantHandler.handleChat(chatRequest);
        res.json({ response });
      }
    } catch (error) {
      console.error('[Assistant API] Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Get conversation history
  router.get('/conversations/:workspace_id', async (req: Request, res: Response) => {
    try {
      const { workspace_id } = req.params;

      // TODO: Implement conversation history retrieval from Supabase
      res.json({
        conversations: [],
      });
    } catch (error) {
      console.error('[Assistant API] Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Apply AI suggestion to canvas
  router.post('/apply-suggestion', async (req: Request, res: Response) => {
    try {
      const { workspace_id, suggestion_id, model_data } = req.body;

      if (!workspace_id || !model_data) {
        return res.status(400).json({
          error: 'workspace_id and model_data are required',
        });
      }

      // TODO: Save model to Supabase
      res.json({
        success: true,
        model_id: `model_${Date.now()}`,
      });
    } catch (error) {
      console.error('[Assistant API] Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Get available patterns
  router.get('/patterns', async (req: Request, res: Response) => {
    try {
      // TODO: Fetch patterns from pattern-library MCP
      res.json({
        patterns: [
          {
            id: 'dv_hub',
            name: 'Data Vault Hub',
            category: 'data_vault',
            description: 'Core business entity with unique business key',
          },
          {
            id: 'kimball_scd_type2',
            name: 'SCD Type 2 Dimension',
            category: 'kimball',
            description: 'Track historical changes with effective dates',
          },
        ],
      });
    } catch (error) {
      console.error('[Assistant API] Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Get MCP server status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const status = mcpManager.getServerStatus();
      const tools = await mcpManager.getToolDefinitions();

      res.json({
        mcp_servers: status,
        available_tools: tools.length,
        tools: tools.map((t) => ({ name: t.name, description: t.description })),
      });
    } catch (error) {
      console.error('[Assistant API] Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  return router;
}
