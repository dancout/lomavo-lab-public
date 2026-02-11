/**
 * mcp-dns: Query Pi-hole stats, manage blocking, and view DNS queries.
 * Supports both primary (Pi) and secondary (NAS) Pi-hole instances.
 *
 * Tools:
 * - get_stats: Summary statistics (queries, blocked, clients)
 * - get_top_domains: Top allowed and blocked domains
 * - get_top_clients: Most active DNS clients
 * - get_blocking_status: Whether ad-blocking is enabled
 * - toggle_blocking: Enable/disable ad-blocking
 * - get_query_log: Recent DNS queries
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig, type Config } from '../shared/config.js';
import { httpGet, httpPost } from '../shared/http-client.js';
import { startServer } from '../shared/server-factory.js';

const config = loadConfig();

/**
 * Pi-hole v6 session manager. Authenticates via /api/auth and caches
 * the session ID for subsequent requests.
 */
class PiholeSession {
  private sid: string | null = null;
  private validUntil = 0;

  constructor(
    private baseUrl: string,
    private password: string,
    private label: string,
  ) {}

  async authenticate(): Promise<string> {
    if (this.sid && Date.now() < this.validUntil) {
      return this.sid;
    }

    const resp = await httpPost<{ session: { sid: string; validity: number; valid: boolean; message?: string } }>(
      `${this.baseUrl}/api/auth`,
      { password: this.password },
    );

    if (!resp.data?.session?.valid) {
      throw new Error(`Pi-hole auth failed (${this.label}): ${resp.data?.session?.message || 'invalid password'}`);
    }

    this.sid = resp.data.session.sid;
    // Refresh 30s before expiry
    this.validUntil = Date.now() + (resp.data.session.validity - 30) * 1000;
    return this.sid;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const sid = await this.authenticate();
    const resp = await httpGet<T>(`${this.baseUrl}${path}`, { ...params, sid });
    return resp.data;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const sid = await this.authenticate();
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('sid', sid);
    const resp = await httpPost<T>(url.toString(), body);
    return resp.data;
  }
}

function getSession(instance: string, cfg: Config): PiholeSession {
  if (instance === 'secondary') {
    return new PiholeSession(cfg.piholeSecondaryUrl, cfg.piholeSecondaryPassword, 'NAS Pi-hole');
  }
  return new PiholeSession(cfg.piholePrimaryUrl, cfg.piholePrimaryPassword, 'Pi Pi-hole');
}

// --- Pi-hole v6 types ---

interface PiholeStats {
  queries: { total: number; blocked: number; percent_blocked: number; unique_domains: number; forwarded: number; cached: number; types: Record<string, number> };
  clients: { total: number; active: number };
  gravity: { domains_being_blocked: number; last_update: number };
  [key: string]: unknown;
}

interface PiholeTopItem {
  domain: string;
  count: number;
}

interface PiholeQuery {
  id: number;
  time: number;
  type: string;
  domain: string;
  client: string;
  status: string;
  reply: string;
  dnssec: string;
  upstream: string;
}

const instanceEnum = z
  .enum(['primary', 'secondary', 'both'])
  .optional()
  .describe('Pi-hole instance: primary (Pi), secondary (NAS), or both (default: primary)');

function registerTools(server: McpServer): void {
  server.tool(
    'get_stats',
    'Get Pi-hole summary statistics (total queries, blocked, clients, gravity domains)',
    {
      instance: instanceEnum,
    },
    async ({ instance }) => {
      try {
        const instances = instance === 'both' ? ['primary', 'secondary'] : [instance || 'primary'];
        const results: string[] = [];

        for (const inst of instances) {
          const session = getSession(inst, config);
          const label = inst === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';

          try {
            const stats = await session.get<PiholeStats>('/api/stats/summary');
            const q = stats.queries;
            const lines = [
              `### ${label}`,
              `  Total queries: ${q.total.toLocaleString()}`,
              `  Blocked: ${q.blocked.toLocaleString()} (${q.percent_blocked.toFixed(1)}%)`,
              `  Domains on blocklist: ${stats.gravity.domains_being_blocked.toLocaleString()}`,
              `  Active clients: ${stats.clients.active}`,
              `  Cached: ${q.cached.toLocaleString()}`,
              `  Forwarded: ${q.forwarded.toLocaleString()}`,
            ];
            results.push(lines.join('\n'));
          } catch (err) {
            results.push(`### ${label}\n  Error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        return { content: [{ type: 'text' as const, text: results.join('\n\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_top_domains',
    'Get top allowed and blocked domains from Pi-hole',
    {
      instance: instanceEnum,
      count: z.number().optional().describe('Number of top domains to return (default: 10)'),
    },
    async ({ instance, count }) => {
      try {
        const session = getSession(instance || 'primary', config);
        const label = instance === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';
        const n = String(count || 10);

        const [allowed, blocked] = await Promise.all([
          session.get<{ top_domains: PiholeTopItem[] }>('/api/stats/top_domains', { count: n }),
          session.get<{ top_domains: PiholeTopItem[] }>('/api/stats/top_domains', { count: n, blocked: 'true' }),
        ]);

        const lines = [`### ${label} - Top Domains\n`, '**Top Allowed:**'];
        if (allowed.top_domains?.length) {
          for (const d of allowed.top_domains) {
            lines.push(`  ${d.count.toLocaleString().padStart(8)} ${d.domain}`);
          }
        } else {
          lines.push('  (none)');
        }

        lines.push('\n**Top Blocked:**');
        if (blocked.top_domains?.length) {
          for (const d of blocked.top_domains) {
            lines.push(`  ${d.count.toLocaleString().padStart(8)} ${d.domain}`);
          }
        } else {
          lines.push('  (none)');
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get top domains: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_top_clients',
    'Get most active DNS clients from Pi-hole',
    {
      instance: instanceEnum,
      count: z.number().optional().describe('Number of top clients to return (default: 10)'),
    },
    async ({ instance, count }) => {
      try {
        const session = getSession(instance || 'primary', config);
        const label = instance === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';

        const data = await session.get<{ top_clients: PiholeTopItem[] }>(
          '/api/stats/top_clients',
          { count: String(count || 10) },
        );

        const lines = [`### ${label} - Top Clients\n`];
        if (data.top_clients?.length) {
          for (const c of data.top_clients) {
            lines.push(`  ${c.count.toLocaleString().padStart(8)} ${c.domain}`);
          }
        } else {
          lines.push('  (none)');
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get top clients: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_blocking_status',
    'Check whether Pi-hole ad-blocking is currently enabled',
    {
      instance: instanceEnum,
    },
    async ({ instance }) => {
      try {
        const instances = instance === 'both' ? ['primary', 'secondary'] : [instance || 'primary'];
        const results: string[] = [];

        for (const inst of instances) {
          const session = getSession(inst, config);
          const label = inst === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';

          try {
            const data = await session.get<{ blocking: string }>('/api/dns/blocking');
            const status = data.blocking === 'enabled' ? 'ENABLED' : 'DISABLED';
            results.push(`${label}: Blocking is ${status}`);
          } catch (err) {
            results.push(`${label}: Error - ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        return { content: [{ type: 'text' as const, text: results.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to check blocking: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'toggle_blocking',
    'Enable or disable Pi-hole ad-blocking. Use timer to auto-revert after N seconds.',
    {
      instance: z
        .enum(['primary', 'secondary'])
        .optional()
        .describe('Pi-hole instance (default: primary). Cannot toggle both at once for safety.'),
      enabled: z.boolean().describe('true to enable blocking, false to disable'),
      timer: z.number().optional().describe('Auto-revert after this many seconds (e.g. 300 for 5 minutes)'),
    },
    async ({ instance, enabled, timer }) => {
      try {
        const session = getSession(instance || 'primary', config);
        const label = instance === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';

        const body: Record<string, unknown> = { blocking: enabled };
        if (timer) body.timer = timer;

        await session.post('/api/dns/blocking', body);

        const action = enabled ? 'enabled' : 'disabled';
        const timerMsg = timer ? ` (will revert in ${timer} seconds)` : '';
        return {
          content: [{ type: 'text' as const, text: `${label}: Blocking ${action}${timerMsg}` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to toggle blocking: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_query_log',
    'Get recent DNS queries from Pi-hole',
    {
      instance: instanceEnum,
      count: z.number().optional().describe('Number of queries to return (default: 20, max: 100)'),
      domain: z.string().optional().describe('Filter by domain (substring match)'),
      client: z.string().optional().describe('Filter by client IP'),
      blocked: z.boolean().optional().describe('Filter to only blocked (true) or allowed (false) queries'),
    },
    async ({ instance, count, domain, client, blocked }) => {
      try {
        const session = getSession(instance || 'primary', config);
        const label = instance === 'secondary' ? 'NAS Pi-hole' : 'Pi Pi-hole';

        const params: Record<string, string> = {
          length: String(Math.min(count || 20, 100)),
        };
        if (domain) params.domain = domain;
        if (client) params.client = client;
        if (blocked !== undefined) params.blocked = String(blocked);

        const data = await session.get<{ queries: PiholeQuery[] }>('/api/queries', params);

        const queries = data.queries || [];
        if (queries.length === 0) {
          return { content: [{ type: 'text' as const, text: `${label}: No matching queries found.` }] };
        }

        const lines = [`### ${label} - Recent Queries (${queries.length})\n`];
        for (const q of queries) {
          const time = new Date(q.time * 1000).toLocaleTimeString();
          const status = q.status.includes('BLOCK') ? 'BLOCKED' : 'OK';
          lines.push(`[${time}] ${status.padEnd(7)} ${q.type.padEnd(5)} ${q.domain} (from ${q.client})`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get queries: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );
}

const PORT = parseInt(process.env.PORT || '8773', 10);

startServer({
  name: 'mcp-dns',
  version: '1.0.0',
  port: PORT,
  registerTools,
});
