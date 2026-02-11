/**
 * Factory for creating MCP servers with Streamable HTTP transport.
 * Each server gets an Express app with /mcp endpoint, /health check,
 * and centralized structured request logging (flows to Loki via Promtail).
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export interface ServerOptions {
  name: string;
  version: string;
  port: number;
  registerTools: (server: McpServer) => void;
}

/**
 * Structured log entry for MCP requests.
 * Logged as JSON to stdout → Promtail → Loki → Grafana.
 * Query in Grafana: {container="mcp-homelab"} | json | event="tool_call"
 */
interface McpLogEntry {
  timestamp: string;
  server: string;
  event: string;
  method?: string;
  tool?: string;
  duration_ms?: number;
  error?: string;
}

function logMcp(entry: McpLogEntry): void {
  console.log(JSON.stringify(entry));
}

/**
 * Extract tool call info from a JSON-RPC request body.
 * Handles both single messages and arrays.
 */
function extractToolCall(body: unknown): { method: string; tool?: string } | null {
  const msg = Array.isArray(body) ? body.find((m: Record<string, unknown>) => m.method === 'tools/call') || body[0] : body;
  if (!msg || typeof msg !== 'object') return null;
  const rpc = msg as Record<string, unknown>;
  const method = rpc.method as string | undefined;
  if (!method) return null;
  const params = rpc.params as Record<string, unknown> | undefined;
  return { method, tool: params?.name as string | undefined };
}

export function startServer(options: ServerOptions): void {
  const { name, version, port, registerTools } = options;

  const app = express();
  app.use(express.json());

  // MCP endpoint - stateless mode (new server+transport per request)
  app.post('/mcp', async (req, res) => {
    const start = Date.now();
    const callInfo = extractToolCall(req.body);

    try {
      const server = new McpServer({ name, version });
      registerTools(server);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      // Use 'finish' (not 'close') — 'close' waits for TCP disconnect which
      // may never fire promptly with HTTP keep-alive connections.
      res.on('finish', () => {
        const duration = Date.now() - start;

        // Log all tool calls; skip initialize/notifications to reduce noise
        if (callInfo?.method === 'tools/call' || callInfo?.method === 'tools/list') {
          logMcp({
            timestamp: new Date().toISOString(),
            server: name,
            event: 'tool_call',
            method: callInfo.method,
            tool: callInfo.tool,
            duration_ms: duration,
          });
        }

        transport.close().catch(() => {});
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const duration = Date.now() - start;
      logMcp({
        timestamp: new Date().toISOString(),
        server: name,
        event: 'error',
        method: callInfo?.method,
        tool: callInfo?.tool,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      error: 'Method not allowed. Use POST for MCP requests.',
    });
  });

  app.delete('/mcp', (_req, res) => {
    res.status(405).json({
      error: 'Method not allowed. Stateless server.',
    });
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(port, '0.0.0.0', () => {
    logMcp({
      timestamp: new Date().toISOString(),
      server: name,
      event: 'started',
    });
    console.log(`${name} v${version} listening on port ${port}`);
    console.log(`  MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.log(`  Health check: http://0.0.0.0:${port}/health`);
  });
}
