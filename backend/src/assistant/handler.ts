import Anthropic from '@anthropic-ai/sdk';
import { MCPServerManager } from '../mcp/mcp-manager.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ChatRequest {
  workspace_id: string;
  message: string;
  context?: {
    current_model?: any;
    selected_tables?: string[];
  };
  stream: boolean;
}

export interface WorkspaceContext {
  workspace_name: string;
  tables: string[];
  existing_models: any[];
  patterns_used: string[];
}

export class AssistantHandler {
  private anthropic: Anthropic;
  private mcpManager: MCPServerManager;
  private supabase: SupabaseClient | null = null;

  constructor(mcpManager: MCPServerManager) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcpManager = mcpManager;

    // Initialize Supabase if configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    }
  }

  async handleChat(request: ChatRequest) {
    console.log('[Assistant] Processing chat request for workspace:', request.workspace_id);

    // Build workspace context
    const workspaceContext = await this.buildWorkspaceContext(request.workspace_id);

    // Build system prompt with MCP tool descriptions
    const systemPrompt = this.buildSystemPrompt(workspaceContext, request.context);

    // Get MCP tools
    const tools = await this.mcpManager.getToolDefinitions();

    console.log('[Assistant] Available MCP tools:', tools.length);

    // Convert MCP tools to Anthropic format
    const anthropicTools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    if (request.stream) {
      return this.handleStreamingChat(request, systemPrompt, anthropicTools);
    } else {
      return this.handleNonStreamingChat(request, systemPrompt, anthropicTools);
    }
  }

  private async handleStreamingChat(
    request: ChatRequest,
    systemPrompt: string,
    tools: any[]
  ) {
    console.log('[Assistant] Starting streaming chat');

    const stream = this.anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.message,
        },
      ],
      tools: tools,
    });

    return stream;
  }

  private async handleNonStreamingChat(
    request: ChatRequest,
    systemPrompt: string,
    tools: any[]
  ) {
    console.log('[Assistant] Starting non-streaming chat');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.message,
        },
      ],
      tools: tools,
    });

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      const toolResults = await this.processToolUses(response.content);

      // Continue conversation with tool results
      const followUp = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.message,
          },
          {
            role: 'assistant',
            content: response.content,
          },
          {
            role: 'user',
            content: toolResults,
          },
        ],
        tools: tools,
      });

      return followUp;
    }

    return response;
  }

  private async processToolUses(content: any[]): Promise<any[]> {
    const toolResults = [];

    for (const block of content) {
      if (block.type === 'tool_use') {
        console.log(`[Assistant] Executing tool: ${block.name}`);

        try {
          const result = await this.mcpManager.executeTool(block.name, block.input);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error(`[Assistant] Tool execution error:`, error);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: String(error) }),
            is_error: true,
          });
        }
      }
    }

    return toolResults;
  }

  private async buildWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
    // If Supabase is not configured, return mock context
    if (!this.supabase) {
      return {
        workspace_name: workspaceId,
        tables: [],
        existing_models: [],
        patterns_used: [],
      };
    }

    try {
      // Fetch workspace details
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single();

      // Fetch existing models
      const { data: models } = await this.supabase
        .from('script_generations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .limit(10);

      return {
        workspace_name: workspace?.name || workspaceId,
        tables: [],
        existing_models: models || [],
        patterns_used: [],
      };
    } catch (error) {
      console.error('[Assistant] Error fetching workspace context:', error);
      return {
        workspace_name: workspaceId,
        tables: [],
        existing_models: [],
        patterns_used: [],
      };
    }
  }

  private buildSystemPrompt(
    context: WorkspaceContext,
    requestContext?: ChatRequest['context']
  ): string {
    const selectedTablesInfo = requestContext?.selected_tables
      ? `\nSelected Tables: ${requestContext.selected_tables.join(', ')}`
      : '';

    const currentModelInfo = requestContext?.current_model
      ? `\nCurrent Model: ${requestContext.current_model.name}`
      : '';

    return `You are an expert data architect specializing in Databricks and data modeling.

Current Workspace Context:
- Workspace: ${context.workspace_name}
- Available Tables: ${context.tables.join(', ') || 'None loaded yet'}
- Existing Models: ${context.existing_models.length}
- Modeling Patterns Used: ${context.patterns_used.join(', ') || 'None'}${selectedTablesInfo}${currentModelInfo}

Your Role:
1. Help users design data models through conversation
2. Recommend appropriate modeling patterns (Data Vault, Kimball, etc.)
3. Apply Databricks optimizations automatically
4. Generate React Flow visualizations and YAML metadata
5. Create deployment-ready Jinja2 templates

You have access to MCP tools to:
- **schema-analyzer**: Analyze existing schemas, detect relationships, suggest keys
- **pattern-library**: Retrieve modeling patterns (Data Vault, Kimball, etc.)
- **model-generator**: Generate models and templates from specifications
- **databricks-optimizer**: Optimize for Databricks (partitioning, clustering, Delta features)

When a user asks to "create a dimension based on product and productcategory tables":
1. Use schema-analyzer to get table metadata
2. Use pattern-library to get Kimball dimension pattern
3. Use model-generator to create the dimension model
4. Use databricks-optimizer to add optimizations
5. Return React Flow JSON and YAML for the user to review

Guidelines:
- Always analyze tables first before making recommendations
- Explain your reasoning clearly
- Provide code examples with proper Databricks syntax
- Suggest optimizations proactively
- Allow the user to refine and iterate on suggestions
- Be concise but thorough

Always explain your recommendations and allow the user to refine them.`;
  }
}
