import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export class MCPServerManager {
  private clients: Map<string, Client> = new Map();
  private serverStatus: Map<string, 'initializing' | 'connected' | 'error'> = new Map();

  constructor(private serverNames: string[]) {}

  async initialize(): Promise<void> {
    console.log('[MCP Manager] Initializing MCP servers:', this.serverNames);

    const initPromises = this.serverNames.map((name) => this.initializeServer(name));
    await Promise.allSettled(initPromises);

    const connectedServers = Array.from(this.serverStatus.entries())
      .filter(([_, status]) => status === 'connected')
      .map(([name]) => name);

    const failedServers = Array.from(this.serverStatus.entries())
      .filter(([_, status]) => status === 'error')
      .map(([name]) => name);

    console.log('[MCP Manager] Connected servers:', connectedServers.length > 0 ? connectedServers : 'none');

    if (failedServers.length > 0) {
      console.warn('[MCP Manager] Failed servers:', failedServers);
      console.warn('[MCP Manager] AI assistant will have limited functionality');
    }

    if (connectedServers.length === 0) {
      console.warn('[MCP Manager] WARNING: No MCP servers connected. AI features will not work.');
    }
  }

  private async initializeServer(serverName: string): Promise<void> {
    const TIMEOUT_MS = 10000; // 10 second timeout

    try {
      this.serverStatus.set(serverName, 'initializing');

      const serverPath = path.resolve(
        __dirname,
        `../../mcp-servers/${serverName}/dist/index.js`
      );

      console.log(`[MCP Manager] Starting ${serverName} at ${serverPath}`);

      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });

      const client = new Client(
        {
          name: `uroq-mcp-client-${serverName}`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Add timeout to connection
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), TIMEOUT_MS);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      this.clients.set(serverName, client);
      this.serverStatus.set(serverName, 'connected');

      console.log(`[MCP Manager] ✓ ${serverName} connected`);
    } catch (error: any) {
      console.error(`[MCP Manager] ✗ ${serverName} failed:`, error?.message || error);
      this.serverStatus.set(serverName, 'error');
    }
  }

  async getToolDefinitions(): Promise<MCPTool[]> {
    const tools: MCPTool[] = [];

    for (const [serverName, client] of this.clients.entries()) {
      try {
        const response = await client.listTools();
        const serverTools = response.tools.map((tool) => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
        }));
        tools.push(...serverTools);
      } catch (error) {
        console.error(`[MCP Manager] Error listing tools from ${serverName}:`, error);
      }
    }

    return tools;
  }

  async executeTool(toolName: string, input: any): Promise<any> {
    // Find which server has this tool
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const response = await client.listTools();
        const hasTool = response.tools.some((t) => t.name === toolName);

        if (hasTool) {
          console.log(`[MCP Manager] Executing ${toolName} on ${serverName}`);
          const result = await client.callTool({ name: toolName, arguments: input });
          return result;
        }
      } catch (error) {
        console.error(`[MCP Manager] Error checking ${serverName}:`, error);
      }
    }

    throw new Error(`Tool ${toolName} not found in any MCP server`);
  }

  getServerStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [name, state] of this.serverStatus.entries()) {
      status[name] = state;
    }
    return status;
  }

  async close(): Promise<void> {
    console.log('[MCP Manager] Closing all MCP connections');
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
        console.log(`[MCP Manager] Closed ${name}`);
      } catch (error) {
        console.error(`[MCP Manager] Error closing ${name}:`, error);
      }
    }
    this.clients.clear();
    this.serverStatus.clear();
  }
}
