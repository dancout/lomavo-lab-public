/**
 * mcp-monitoring: Query Prometheus metrics, Grafana alerts, and Loki logs.
 *
 * Tools (high-level, preferred by LLM clients):
 * - get_current_metrics: Get current CPU/RAM/disk/temp for a machine
 * - get_metric_history: Get historical time-series for a metric on a machine
 * - list_alerts: Get current Grafana alert states
 *
 * Tools (advanced, raw queries):
 * - query_prometheus: Run a PromQL instant query
 * - query_prometheus_range: Run a PromQL range query
 * - search_logs: Search container logs via Loki (LogQL)
 * - list_scrape_targets: Show Prometheus scrape target health
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig } from '../shared/config.js';
import { httpGet } from '../shared/http-client.js';
import { startServer } from '../shared/server-factory.js';

const config = loadConfig();

// --- Prometheus types ---
interface PrometheusResult {
  metric: Record<string, string>;
  value?: [number, string]; // instant query
  values?: [number, string][]; // range query
}

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
  error?: string;
  errorType?: string;
}

interface PrometheusScrapeTarget {
  labels: Record<string, string>;
  health: string;
  lastScrape: string;
  lastError: string;
}

interface PrometheusTargetsResponse {
  status: string;
  data: {
    activeTargets: PrometheusScrapeTarget[];
  };
}

// --- Grafana types ---
interface GrafanaAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  status: {
    state: string;
    silencedBy?: string[];
    inhibitedBy?: string[];
  };
  startsAt?: string;
  endsAt?: string;
}

// --- Loki types ---
interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiResponse {
  status: string;
  data: {
    resultType: string;
    result: LokiStream[];
  };
}

function formatPrometheusResult(result: PrometheusResult[]): string {
  if (result.length === 0) return 'No data returned.';

  return result
    .map((r) => {
      const labels = Object.entries(r.metric)
        .filter(([k]) => k !== '__name__')
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      const name = r.metric.__name__ || 'value';

      if (r.value) {
        return `${name}{${labels}} = ${r.value[1]}`;
      }
      if (r.values) {
        const points = r.values
          .map(([ts, val]) => `  ${new Date(ts * 1000).toISOString()}: ${val}`)
          .join('\n');
        return `${name}{${labels}}:\n${points}`;
      }
      return `${name}{${labels}} = (no value)`;
    })
    .join('\n');
}

function registerTools(server: McpServer): void {
  server.tool(
    'query_prometheus',
    'Run a raw PromQL instant query. Advanced tool — prefer get_current_metrics or get_metric_history for common metrics. Only use this for custom queries not covered by those tools.',
    {
      query: z.string().describe('PromQL query expression (e.g. "up", "glances_cpu_percent{machine=\\"rpi\\"}")'),
      time: z
        .string()
        .optional()
        .describe('Evaluation timestamp (RFC3339 or Unix). Default: now'),
    },
    async ({ query, time }) => {
      const params: Record<string, string> = { query };
      if (time) params.time = time;

      try {
        const resp = await httpGet<PrometheusResponse>(
          `${config.prometheusUrl}/api/v1/query`,
          params,
        );

        if (resp.data.status !== 'success') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Prometheus error: ${resp.data.errorType}: ${resp.data.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatPrometheusResult(resp.data.data.result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query Prometheus: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'query_prometheus_range',
    'Run a raw PromQL range query for time-series data. Advanced tool — prefer get_metric_history for common metrics like CPU, RAM, disk, and temperature over time.',
    {
      query: z.string().describe('PromQL query expression (e.g. "glances_cpu_percent{machine=\\"rpi\\"}")'),
      start: z.string().optional().describe('How far back to query. Relative like "1h", "30m", "24h" or RFC3339 like "2026-02-07T00:00:00Z". Default: "1h"'),
      end: z.string().optional().describe('End time (default: now)'),
      step: z.string().optional().describe('Step interval (default: "1m")'),
    },
    async ({ query, start, end, step }) => {
      // Support relative time like "1h", "30m"
      const now = Date.now() / 1000;
      const startInput = start || '1h';
      let startTime = startInput;
      if (/^\d+[smhd]$/.test(startInput)) {
        const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
        const unit = startInput.slice(-1);
        const val = parseInt(startInput.slice(0, -1), 10);
        startTime = String(now - val * (units[unit] || 60));
      }

      const params: Record<string, string> = {
        query,
        start: startTime,
        end: end || String(now),
        step: step || '1m',
      };

      try {
        const resp = await httpGet<PrometheusResponse>(
          `${config.prometheusUrl}/api/v1/query_range`,
          params,
        );

        if (resp.data.status !== 'success') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Prometheus error: ${resp.data.errorType}: ${resp.data.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatPrometheusResult(resp.data.data.result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query Prometheus: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_current_metrics',
    'Get current live values for CPU usage, RAM usage, disk usage, and temperature for a homelab machine. Use this for "what is the current CPU/temp/RAM?" questions. For historical trends over time, use get_metric_history instead.',
    {
      machine: z
        .enum(['rpi', 'gpc', 'nas', 'all'])
        .describe('Which machine: "rpi" = Raspberry Pi, "gpc" = Gaming PC, "nas" = QNAP NAS, "all" = all three'),
    },
    async ({ machine }) => {
      const targets = machine === 'all' ? ['rpi', 'gpc', 'nas'] : [machine];
      const results: string[] = [];

      for (const target of targets) {
        const machineConfig = config.machines.find((m) => m.name === target);
        if (!machineConfig) continue;

        const queries: Record<string, string> =
          target === 'gpc'
            ? {
                CPU: 'windows_cpu_usage_percent',
                RAM: 'windows_memory_usage_percent',
                'Disk C': 'windows_disk_usage_percent{drive="C"}',
                'Disk D': 'windows_disk_usage_percent{drive="D"}',
                'CPU Temp': 'windows_temperature_celsius{sensor="CPU_Package"}',
                'GPU Temp': 'windows_temperature_celsius{sensor="GPU_Hot_Spot"}',
              }
            : {
                CPU: `glances_cpu_percent{machine="${target}"}`,
                RAM: `glances_memory_percent{machine="${target}"}`,
                Disk: `glances_fs_percent{machine="${target}"}`,
                Temp: `glances_temperature_celsius{machine="${target}"}`,
                Load: `glances_load_5{machine="${target}"}`,
              };

        const lines: string[] = [`### ${machineConfig.label} (${machineConfig.ip})`];

        for (const [label, query] of Object.entries(queries)) {
          try {
            const resp = await httpGet<PrometheusResponse>(
              `${config.prometheusUrl}/api/v1/query`,
              { query },
            );
            if (resp.data.status === 'success' && resp.data.data.result.length > 0) {
              const value = resp.data.data.result[0].value?.[1] || 'N/A';
              const numVal = parseFloat(value);
              const formatted = isNaN(numVal) ? value : numVal.toFixed(1);
              lines.push(`  ${label}: ${formatted}${label.includes('Temp') ? ' C' : label.includes('CPU') || label.includes('RAM') || label.includes('Disk') ? '%' : ''}`);
            } else {
              lines.push(`  ${label}: N/A`);
            }
          } catch {
            lines.push(`  ${label}: (error)`);
          }
        }

        results.push(lines.join('\n'));
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: results.join('\n\n'),
          },
        ],
      };
    },
  );

  server.tool(
    'get_metric_history',
    'Get historical time-series data for a common metric (CPU, RAM, disk, temperature, load) on a homelab machine. Use this for questions like "what was the CPU usage over the last hour?" or "show me temperature trends for the past 24 hours". Returns timestamped values. For current/live values, use get_current_metrics instead.',
    {
      machine: z
        .enum(['rpi', 'gpc', 'nas'])
        .describe('Which machine: "rpi" = Raspberry Pi, "gpc" = Gaming PC, "nas" = QNAP NAS'),
      metric: z
        .enum(['cpu', 'ram', 'disk', 'temp', 'load'])
        .describe('Which metric: "cpu" = CPU usage %, "ram" = RAM usage %, "disk" = disk usage %, "temp" = temperature in Celsius, "load" = 5-minute load average (Pi/NAS only)'),
      duration: z
        .string()
        .optional()
        .describe('How far back to look. Examples: "1h", "30m", "6h", "24h", "7d". Default: "1h"'),
      step: z
        .string()
        .optional()
        .describe('Data point interval. Examples: "1m", "5m", "15m". Default: "5m"'),
    },
    async ({ machine, metric, duration, step }) => {
      const machineConfig = config.machines.find((m) => m.name === machine);
      if (!machineConfig) {
        return { content: [{ type: 'text' as const, text: `Unknown machine: ${machine}` }], isError: true };
      }

      // Map friendly metric names to PromQL queries
      const queryMap: Record<string, Record<string, string>> = {
        gpc: {
          cpu: 'windows_cpu_usage_percent',
          ram: 'windows_memory_usage_percent',
          disk: 'windows_disk_usage_percent{drive="C"}',
          temp: 'windows_temperature_celsius{sensor="CPU_Package"}',
          load: 'windows_cpu_usage_percent', // no load average on Windows, fallback to CPU
        },
        rpi: {
          cpu: `glances_cpu_percent{machine="rpi"}`,
          ram: `glances_memory_percent{machine="rpi"}`,
          disk: `glances_fs_percent{machine="rpi"}`,
          temp: `glances_temperature_celsius{machine="rpi"}`,
          load: `glances_load_5{machine="rpi"}`,
        },
        nas: {
          cpu: `glances_cpu_percent{machine="nas"}`,
          ram: `glances_memory_percent{machine="nas"}`,
          disk: `glances_fs_percent{machine="nas"}`,
          temp: `glances_temperature_celsius{machine="nas"}`,
          load: `glances_load_5{machine="nas"}`,
        },
      };

      const query = queryMap[machine]?.[metric];
      if (!query) {
        return { content: [{ type: 'text' as const, text: `No query for ${metric} on ${machine}` }], isError: true };
      }

      // Parse duration to compute start time
      const now = Date.now() / 1000;
      const dur = duration || '1h';
      const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      let startTime: string;
      if (/^\d+[smhd]$/.test(dur)) {
        const unit = dur.slice(-1);
        const val = parseInt(dur.slice(0, -1), 10);
        startTime = String(now - val * (units[unit] || 3600));
      } else {
        startTime = dur;
      }

      try {
        const resp = await httpGet<PrometheusResponse>(
          `${config.prometheusUrl}/api/v1/query_range`,
          { query, start: startTime, end: String(now), step: step || '5m' },
        );

        if (resp.data.status !== 'success') {
          return {
            content: [{ type: 'text' as const, text: `Prometheus error: ${resp.data.errorType}: ${resp.data.error}` }],
            isError: true,
          };
        }

        const result = resp.data.data.result;
        if (result.length === 0) {
          return { content: [{ type: 'text' as const, text: `No ${metric} data found for ${machineConfig.label} in the last ${dur}.` }] };
        }

        // Format with summary stats
        const metricLabels: Record<string, string> = {
          cpu: 'CPU Usage (%)', ram: 'RAM Usage (%)', disk: 'Disk Usage (%)',
          temp: 'Temperature (°C)', load: 'Load Average (5m)',
        };

        const lines: string[] = [`### ${machineConfig.label} — ${metricLabels[metric]} (last ${dur})\n`];

        for (const series of result) {
          if (!series.values || series.values.length === 0) continue;

          const values = series.values.map(([, v]) => parseFloat(v)).filter((v) => !isNaN(v));
          if (values.length === 0) continue;

          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const current = values[values.length - 1];

          // Include sensor label if present (for temp)
          const sensor = series.metric.sensor || series.metric.name || '';
          const sensorLabel = sensor ? ` [${sensor}]` : '';

          lines.push(`**Summary${sensorLabel}:** Current: ${current.toFixed(1)} | Min: ${min.toFixed(1)} | Max: ${max.toFixed(1)} | Avg: ${avg.toFixed(1)}\n`);

          // Show data points (limit to ~20 for readability)
          const interval = Math.max(1, Math.floor(series.values.length / 20));
          lines.push('**Timeline:**');
          for (let i = 0; i < series.values.length; i += interval) {
            const [ts, val] = series.values[i];
            const time = new Date(ts * 1000).toLocaleTimeString('en-US', { timeZone: 'America/Detroit' });
            lines.push(`  ${time}: ${parseFloat(val).toFixed(1)}`);
          }
          // Always include the last point
          const last = series.values[series.values.length - 1];
          if (series.values.length % interval !== 1) {
            lines.push(`  ${new Date(last[0] * 1000).toLocaleTimeString('en-US', { timeZone: 'America/Detroit' })}: ${parseFloat(last[1]).toFixed(1)}`);
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get ${metric} history: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'search_logs',
    'Search container logs stored in Loki. Use this for finding errors, events, or activity in Docker container logs. Requires a LogQL query with a stream selector.',
    {
      query: z.string().describe('LogQL query. Must include a stream selector in braces, e.g. {container="pihole"} |= "error" or {job="promtail"} |~ "timeout|refused"'),
      start: z.string().optional().describe('How far back to search. Relative like "1h", "30m", "24h" or RFC3339. Default: "1h"'),
      limit: z.number().optional().describe('Max log lines to return (default: 100)'),
    },
    async ({ query, start, limit }) => {
      const now = Date.now();
      let startNs: string;

      if (!start || /^\d+[smhd]$/.test(start || '')) {
        const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const dur = start || '1h';
        const unit = dur.slice(-1);
        const val = parseInt(dur.slice(0, -1), 10);
        startNs = String((now - val * (units[unit] || 3600000)) * 1_000_000);
      } else {
        startNs = String(new Date(start).getTime() * 1_000_000);
      }

      try {
        const resp = await httpGet<LokiResponse>(
          `${config.lokiUrl}/loki/api/v1/query_range`,
          {
            query,
            start: startNs,
            end: String(now * 1_000_000),
            limit: String(limit || 100),
          },
        );

        if (resp.data.status !== 'success') {
          return {
            content: [{ type: 'text' as const, text: `Loki error: ${JSON.stringify(resp.data)}` }],
            isError: true,
          };
        }

        const streams = resp.data.data.result;
        if (streams.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No log entries found.' }],
          };
        }

        const lines: string[] = [];
        for (const stream of streams) {
          const labels = Object.entries(stream.stream)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          lines.push(`--- ${labels} ---`);
          for (const [ts, line] of stream.values) {
            const time = new Date(parseInt(ts, 10) / 1_000_000).toISOString();
            lines.push(`[${time}] ${line}`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query Loki: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_alerts',
    'Get current Grafana alert states. Use this to check if anything is wrong in the homelab — alerts fire when thresholds are exceeded (high CPU, disk full, service down, etc.).',
    {
      state: z
        .enum(['all', 'firing', 'pending', 'normal'])
        .optional()
        .describe('Filter by alert state: "firing" = active problems, "pending" = about to fire, "normal" = healthy, "all" = show everything. Default: "all"'),
    },
    async ({ state }) => {
      try {
        const resp = await httpGet<GrafanaAlert[]>(
          `${config.grafanaUrl}/api/alertmanager/grafana/api/v2/alerts`,
        );

        let alerts = resp.data;
        if (state && state !== 'all') {
          // Grafana Alertmanager V2: state is under status.state
          // Map: "active" → firing, "suppressed"/"unprocessed" → pending
          alerts = alerts.filter((a) => {
            const alertState = a.status?.state;
            if (state === 'firing') return alertState === 'active';
            if (state === 'pending') return alertState === 'suppressed' || alertState === 'unprocessed';
            if (state === 'normal') return !alertState || alertState === '';
            return true;
          });
        }

        if (!Array.isArray(alerts) || alerts.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: state ? `No ${state} alerts.` : 'No alerts configured or all normal.',
              },
            ],
          };
        }

        const lines = alerts.map((a) => {
          const name = a.labels?.alertname || 'Unknown';
          const severity = a.labels?.severity || 'unknown';
          const summary = a.annotations?.summary || '';
          const alertState = a.status?.state?.toUpperCase() || 'UNKNOWN';
          return `[${alertState}] ${name} (${severity})${summary ? ': ' + summary : ''}`;
        });

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query Grafana alerts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_scrape_targets',
    'Show Prometheus scrape target health. Use this to check if monitoring data collection is working — shows which endpoints Prometheus is scraping and whether they are UP or DOWN.',
    {},
    async () => {
      try {
        const resp = await httpGet<PrometheusTargetsResponse>(
          `${config.prometheusUrl}/api/v1/targets`,
        );

        const targets = resp.data.data.activeTargets;
        if (!targets || targets.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No scrape targets found.' }],
          };
        }

        const lines = targets.map((t) => {
          const job = t.labels.job || 'unknown';
          const instance = t.labels.instance || 'unknown';
          const health = t.health === 'up' ? 'UP' : 'DOWN';
          const lastErr = t.lastError ? ` (${t.lastError})` : '';
          return `[${health}] ${job} @ ${instance}${lastErr}`;
        });

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to query Prometheus targets: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

const PORT = parseInt(process.env.PORT || '8771', 10);

startServer({
  name: 'mcp-monitoring',
  version: '1.0.0',
  port: PORT,
  registerTools,
});
